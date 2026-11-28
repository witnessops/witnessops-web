-- Additive, source-only Microsoft Teams identity linking.
-- A verified Entra token may create a short-lived one-time intent. An existing
-- authenticated Academy session explicitly confirms that intent for its own
-- immutable academy_identities row. This migration never creates or changes an
-- Academy identity, session, grant, or lesson draft.

CREATE TABLE IF NOT EXISTS public.academy_teams_link_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  entra_issuer text NOT NULL CHECK (length(entra_issuer) BETWEEN 1 AND 2048),
  tenant_id uuid NOT NULL,
  object_id uuid NOT NULL,
  entra_subject text NOT NULL CHECK (
    length(entra_subject) BETWEEN 1 AND 256
    AND entra_subject = btrim(entra_subject)
    AND entra_subject !~ '[[:cntrl:]]'
  ),
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  consumed_reason text,
  confirmed_identity_id uuid REFERENCES public.academy_identities(id),
  CHECK (tenant_id <> '00000000-0000-0000-0000-000000000000'::uuid),
  CHECK (object_id <> '00000000-0000-0000-0000-000000000000'::uuid),
  CHECK (entra_issuer = 'https://login.microsoftonline.com/' || tenant_id::text || '/v2.0'),
  CHECK (expires_at > created_at AND expires_at <= created_at + interval '5 minutes'),
  CHECK (consumed_reason IS NULL OR consumed_reason IN (
    'confirmed', 'link_conflict', 'academy_user_unlink'
  )),
  CHECK ((
    (consumed_at IS NULL AND consumed_reason IS NULL AND confirmed_identity_id IS NULL)
    OR (consumed_at IS NOT NULL AND consumed_reason IN ('confirmed', 'link_conflict')
      AND confirmed_identity_id IS NOT NULL)
    OR (consumed_at IS NOT NULL AND consumed_reason = 'academy_user_unlink'
      AND confirmed_identity_id IS NULL)
  ) IS TRUE)
);

CREATE TABLE IF NOT EXISTS public.academy_teams_identity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id uuid NOT NULL UNIQUE REFERENCES public.academy_teams_link_intents(id),
  entra_issuer text NOT NULL CHECK (length(entra_issuer) BETWEEN 1 AND 2048),
  tenant_id uuid NOT NULL,
  object_id uuid NOT NULL,
  entra_subject text NOT NULL CHECK (
    length(entra_subject) BETWEEN 1 AND 256
    AND entra_subject = btrim(entra_subject)
    AND entra_subject !~ '[[:cntrl:]]'
  ),
  academy_identity_id uuid NOT NULL REFERENCES public.academy_identities(id),
  linked_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  revoked_at timestamptz,
  revocation_reason text,
  CHECK (tenant_id <> '00000000-0000-0000-0000-000000000000'::uuid),
  CHECK (object_id <> '00000000-0000-0000-0000-000000000000'::uuid),
  CHECK (entra_issuer = 'https://login.microsoftonline.com/' || tenant_id::text || '/v2.0'),
  CHECK ((revoked_at IS NULL) = (revocation_reason IS NULL)),
  CHECK (revocation_reason IS NULL OR revocation_reason = 'academy_user_unlink')
);

CREATE UNIQUE INDEX IF NOT EXISTS academy_teams_identity_links_active_entra_uq
  ON public.academy_teams_identity_links(tenant_id, object_id)
  WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS academy_teams_identity_links_active_academy_uq
  ON public.academy_teams_identity_links(academy_identity_id)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS academy_teams_link_intents_expires_idx
  ON public.academy_teams_link_intents(expires_at, id);

-- Direct table access remains unavailable to every runtime. The lesson app can
-- execute only the narrow functions granted at the end of this migration.
REVOKE ALL ON public.academy_teams_link_intents, public.academy_teams_identity_links
  FROM PUBLIC, academy_app, academy_mcp;

CREATE OR REPLACE FUNCTION public.academy_create_teams_link_intent(
  p_token_hash text,
  p_entra_issuer text,
  p_tenant_id uuid,
  p_object_id uuid,
  p_entra_subject text
)
RETURNS TABLE (intent_id uuid, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  saved_intent_id uuid;
  saved_expires_at timestamptz;
BEGIN
  -- Serialize creation with confirmation and unlink. This gives every intent a
  -- single ordering point: an intent created before unlink is invalidated by
  -- unlink, while a new intent created after unlink may be confirmed normally.
  PERFORM pg_catalog.pg_advisory_xact_lock(17465201, 5);

  -- Keep bearer-derived identifiers bounded without needing a scheduler. Each
  -- new intent removes up to 256 unreferenced records that have been expired for
  -- at least 24 hours. Intents referenced by link audit rows are retained with
  -- those rows and cannot be removed by this runtime path.
  WITH purgeable AS (
    SELECT old_intent.id
    FROM public.academy_teams_link_intents old_intent
    WHERE old_intent.expires_at <= pg_catalog.clock_timestamp() - interval '24 hours'
      AND NOT EXISTS (
        SELECT 1 FROM public.academy_teams_identity_links link
        WHERE link.intent_id = old_intent.id
      )
    ORDER BY old_intent.expires_at, old_intent.id
    LIMIT 256
    FOR UPDATE OF old_intent SKIP LOCKED
  )
  DELETE FROM public.academy_teams_link_intents old_intent
  USING purgeable
  WHERE old_intent.id = purgeable.id;

  saved_expires_at := pg_catalog.statement_timestamp() + interval '5 minutes';
  INSERT INTO public.academy_teams_link_intents (
    token_hash, entra_issuer, tenant_id, object_id, entra_subject, expires_at
  ) VALUES (
    p_token_hash, p_entra_issuer, p_tenant_id, p_object_id, p_entra_subject,
    saved_expires_at
  )
  RETURNING id INTO saved_intent_id;
  RETURN QUERY SELECT saved_intent_id, saved_expires_at;
END;
$function$;

CREATE OR REPLACE FUNCTION public.academy_preview_teams_link_intent(p_token_hash text)
RETURNS TABLE (intent_id uuid, expires_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
  SELECT intent.id, intent.expires_at
  FROM public.academy_teams_link_intents intent
  WHERE intent.token_hash = p_token_hash
    AND intent.consumed_at IS NULL
    AND intent.expires_at > pg_catalog.statement_timestamp()
$function$;

CREATE OR REPLACE FUNCTION public.academy_confirm_teams_link_intent(
  p_token_hash text,
  p_identity_id uuid
)
RETURNS TABLE (link_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  intent public.academy_teams_link_intents%ROWTYPE;
  saved_link_id uuid;
BEGIN
  -- Linking is rare and security-sensitive. One fixed transaction lock makes
  -- conflict handling deterministic across two different intents racing to
  -- claim the same Teams or Academy identity.
  PERFORM pg_catalog.pg_advisory_xact_lock(17465201, 5);

  SELECT * INTO intent
  FROM public.academy_teams_link_intents candidate
  WHERE candidate.token_hash = p_token_hash
    AND candidate.consumed_at IS NULL
    AND candidate.expires_at > pg_catalog.clock_timestamp()
  FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM public.academy_identities identity
    WHERE identity.id = p_identity_id
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.academy_teams_identity_links active_link
    WHERE active_link.revoked_at IS NULL
      AND ((active_link.tenant_id = intent.tenant_id AND active_link.object_id = intent.object_id)
        OR active_link.academy_identity_id = p_identity_id)
  ) THEN
    -- A valid confirmation attempt consumes its bearer even when an active-link
    -- conflict makes the requested binding unavailable.
    UPDATE public.academy_teams_link_intents
    SET consumed_at = pg_catalog.clock_timestamp(), consumed_reason = 'link_conflict',
        confirmed_identity_id = p_identity_id
    WHERE id = intent.id;
    RETURN;
  END IF;

  UPDATE public.academy_teams_link_intents
  SET consumed_at = pg_catalog.clock_timestamp(), consumed_reason = 'confirmed',
      confirmed_identity_id = p_identity_id
  WHERE id = intent.id;

  INSERT INTO public.academy_teams_identity_links (
    intent_id, entra_issuer, tenant_id, object_id, entra_subject, academy_identity_id
  ) VALUES (
    intent.id, intent.entra_issuer, intent.tenant_id, intent.object_id,
    intent.entra_subject, p_identity_id
  )
  RETURNING id INTO saved_link_id;

  RETURN QUERY SELECT saved_link_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.academy_resolve_teams_identity_link(
  p_entra_issuer text,
  p_tenant_id uuid,
  p_object_id uuid,
  p_entra_subject text
)
RETURNS TABLE (link_id uuid, identity_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
  SELECT link.id, link.academy_identity_id
  FROM public.academy_teams_identity_links link
  WHERE link.entra_issuer = p_entra_issuer
    AND link.tenant_id = p_tenant_id
    AND link.object_id = p_object_id
    AND link.entra_subject = p_entra_subject
    AND link.revoked_at IS NULL
$function$;

CREATE OR REPLACE FUNCTION public.academy_has_teams_identity_link(p_identity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.academy_teams_identity_links link
    WHERE link.academy_identity_id = p_identity_id AND link.revoked_at IS NULL
  )
$function$;

CREATE OR REPLACE FUNCTION public.academy_revoke_teams_identity_link(p_identity_id uuid)
RETURNS TABLE (link_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  active_link public.academy_teams_identity_links%ROWTYPE;
BEGIN
  -- Serialize with confirmation so a pre-unlink intent cannot race the revoke
  -- and silently recreate the active mapping.
  PERFORM pg_catalog.pg_advisory_xact_lock(17465201, 5);
  SELECT * INTO active_link
  FROM public.academy_teams_identity_links candidate
  WHERE candidate.academy_identity_id = p_identity_id
    AND candidate.revoked_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.academy_teams_link_intents intent
  SET consumed_at = pg_catalog.clock_timestamp(), consumed_reason = 'academy_user_unlink',
      confirmed_identity_id = NULL
  WHERE intent.tenant_id = active_link.tenant_id
    AND intent.object_id = active_link.object_id
    AND intent.consumed_at IS NULL;

  UPDATE public.academy_teams_identity_links link
  SET revoked_at = pg_catalog.clock_timestamp(), revocation_reason = 'academy_user_unlink'
  WHERE link.id = active_link.id
  RETURNING link.id INTO link_id;
  RETURN NEXT;
END;
$function$;

ALTER FUNCTION public.academy_create_teams_link_intent(text, text, uuid, uuid, text)
  OWNER TO academy_migrator;
ALTER FUNCTION public.academy_preview_teams_link_intent(text)
  OWNER TO academy_migrator;
ALTER FUNCTION public.academy_confirm_teams_link_intent(text, uuid)
  OWNER TO academy_migrator;
ALTER FUNCTION public.academy_resolve_teams_identity_link(text, uuid, uuid, text)
  OWNER TO academy_migrator;
ALTER FUNCTION public.academy_has_teams_identity_link(uuid)
  OWNER TO academy_migrator;
ALTER FUNCTION public.academy_revoke_teams_identity_link(uuid)
  OWNER TO academy_migrator;

REVOKE ALL ON FUNCTION public.academy_create_teams_link_intent(text, text, uuid, uuid, text)
  FROM PUBLIC, academy_app, academy_mcp;
REVOKE ALL ON FUNCTION public.academy_preview_teams_link_intent(text)
  FROM PUBLIC, academy_app, academy_mcp;
REVOKE ALL ON FUNCTION public.academy_confirm_teams_link_intent(text, uuid)
  FROM PUBLIC, academy_app, academy_mcp;
REVOKE ALL ON FUNCTION public.academy_resolve_teams_identity_link(text, uuid, uuid, text)
  FROM PUBLIC, academy_app, academy_mcp;
REVOKE ALL ON FUNCTION public.academy_has_teams_identity_link(uuid)
  FROM PUBLIC, academy_app, academy_mcp;
REVOKE ALL ON FUNCTION public.academy_revoke_teams_identity_link(uuid)
  FROM PUBLIC, academy_app, academy_mcp;

GRANT EXECUTE ON FUNCTION public.academy_create_teams_link_intent(text, text, uuid, uuid, text)
  TO academy_app;
GRANT EXECUTE ON FUNCTION public.academy_preview_teams_link_intent(text)
  TO academy_app;
GRANT EXECUTE ON FUNCTION public.academy_confirm_teams_link_intent(text, uuid)
  TO academy_app;
GRANT EXECUTE ON FUNCTION public.academy_resolve_teams_identity_link(text, uuid, uuid, text)
  TO academy_app;
GRANT EXECUTE ON FUNCTION public.academy_has_teams_identity_link(uuid)
  TO academy_app;
GRANT EXECUTE ON FUNCTION public.academy_revoke_teams_identity_link(uuid)
  TO academy_app;

INSERT INTO public.academy_schema_migrations(version)
VALUES ('005_academy_teams_identity_links') ON CONFLICT DO NOTHING;
