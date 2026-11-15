-- Additive pilot admission. Apply only as academy_migrator through the explicit migration path.
-- No existing identity, session or draft is rewritten. Production application requires separate GO.
CREATE TABLE IF NOT EXISTS public.academy_pilot_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  recipient_issuer text NOT NULL CHECK (length(recipient_issuer) BETWEEN 1 AND 2048),
  recipient_subject text NOT NULL CHECK (length(recipient_subject) BETWEEN 1 AND 255),
  course_id text NOT NULL DEFAULT 'verify-results-pilot' CHECK (course_id = 'verify-results-pilot'),
  access_kind text NOT NULL DEFAULT 'approved_free' CHECK (access_kind = 'approved_free'),
  role text NOT NULL DEFAULT 'learner' CHECK (role = 'learner'),
  approval_reference text NOT NULL CHECK (length(btrim(approval_reference)) BETWEEN 1 AND 500),
  administrator_reference text NOT NULL CHECK (length(btrim(administrator_reference)) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  expires_at timestamptz NOT NULL,
  redeemed_at timestamptz,
  redeemed_identity_id uuid REFERENCES public.academy_identities(id),
  revoked_at timestamptz,
  revocation_reference text,
  CHECK (expires_at > created_at AND expires_at <= created_at + interval '7 days'),
  CHECK ((redeemed_at IS NULL) = (redeemed_identity_id IS NULL)),
  CHECK (revoked_at IS NULL OR revocation_reference IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.academy_pilot_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id uuid NOT NULL REFERENCES public.academy_identities(id),
  invitation_id uuid NOT NULL UNIQUE REFERENCES public.academy_pilot_invitations(id),
  course_id text NOT NULL DEFAULT 'verify-results-pilot' CHECK (course_id = 'verify-results-pilot'),
  access_kind text NOT NULL DEFAULT 'approved_free' CHECK (access_kind = 'approved_free'),
  role text NOT NULL DEFAULT 'learner' CHECK (role = 'learner'),
  approval_reference text NOT NULL CHECK (length(btrim(approval_reference)) BETWEEN 1 AND 500),
  administrator_reference text NOT NULL CHECK (length(btrim(administrator_reference)) BETWEEN 1 AND 500),
  granted_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  revoked_at timestamptz,
  revocation_reference text,
  UNIQUE (identity_id, course_id),
  CHECK (revoked_at IS NULL OR revocation_reference IS NOT NULL)
);

-- The application can inspect grant status, but cannot mint, revive or revoke access.
REVOKE ALL ON public.academy_pilot_invitations, public.academy_pilot_grants FROM PUBLIC, academy_app, academy_mcp;
GRANT SELECT (id, identity_id, course_id, access_kind, role, revoked_at)
  ON public.academy_pilot_grants TO academy_app;

CREATE OR REPLACE FUNCTION public.academy_preview_pilot_invitation(p_token_hash text, p_identity_id uuid)
RETURNS TABLE (invitation_id uuid, expires_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
  SELECT invitation.id, invitation.expires_at
  FROM public.academy_pilot_invitations invitation
  JOIN public.academy_identities learner
    ON learner.id = p_identity_id
    AND learner.issuer = invitation.recipient_issuer
    AND learner.subject = invitation.recipient_subject
  WHERE invitation.token_hash = p_token_hash
    AND invitation.revoked_at IS NULL AND invitation.redeemed_at IS NULL
    AND invitation.expires_at > pg_catalog.clock_timestamp()
    AND invitation.course_id = 'verify-results-pilot'
    AND invitation.access_kind = 'approved_free' AND invitation.role = 'learner'
    AND NOT EXISTS (
      SELECT 1 FROM public.academy_pilot_grants existing
      WHERE existing.identity_id = p_identity_id AND existing.course_id = 'verify-results-pilot'
    )
    AND (SELECT count(*) FROM public.academy_pilot_grants active WHERE active.revoked_at IS NULL) < 4
$function$;

CREATE OR REPLACE FUNCTION public.academy_redeem_pilot_invitation(p_token_hash text, p_identity_id uuid)
RETURNS TABLE (invitation_id uuid, grant_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  invitation public.academy_pilot_invitations%ROWTYPE;
  saved_grant_id uuid;
BEGIN
  -- Serialize this four-learner pilot's admission count and per-recipient grants.
  PERFORM pg_catalog.pg_advisory_xact_lock(17465201, 4);
  SELECT * INTO invitation
    FROM public.academy_pilot_invitations candidate
    WHERE candidate.token_hash = p_token_hash
    FOR UPDATE;
  IF NOT FOUND OR invitation.revoked_at IS NOT NULL OR invitation.redeemed_at IS NOT NULL
    OR invitation.expires_at <= pg_catalog.clock_timestamp()
    OR invitation.course_id <> 'verify-results-pilot'
    OR invitation.access_kind <> 'approved_free' OR invitation.role <> 'learner' THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.academy_identities learner
    WHERE learner.id = p_identity_id
      AND learner.issuer = invitation.recipient_issuer
      AND learner.subject = invitation.recipient_subject
  ) THEN
    RETURN;
  END IF;
  IF (SELECT count(*) FROM public.academy_pilot_grants existing WHERE existing.revoked_at IS NULL) >= 4 THEN
    RETURN;
  END IF;
  INSERT INTO public.academy_pilot_grants (
    identity_id, invitation_id, approval_reference, administrator_reference
  ) VALUES (
    p_identity_id, invitation.id, invitation.approval_reference, invitation.administrator_reference
  ) ON CONFLICT (identity_id, course_id) DO NOTHING
  RETURNING id INTO saved_grant_id;
  IF saved_grant_id IS NULL THEN
    -- A second invitation can never revive a previously revoked grant.
    RETURN;
  END IF;
  UPDATE public.academy_pilot_invitations
    SET redeemed_at = pg_catalog.clock_timestamp(), redeemed_identity_id = p_identity_id
    WHERE id = invitation.id;
  RETURN QUERY SELECT invitation.id, saved_grant_id;
END;
$function$;

ALTER FUNCTION public.academy_preview_pilot_invitation(text, uuid) OWNER TO academy_migrator;
ALTER FUNCTION public.academy_redeem_pilot_invitation(text, uuid) OWNER TO academy_migrator;
REVOKE ALL ON FUNCTION public.academy_preview_pilot_invitation(text, uuid) FROM PUBLIC, academy_app, academy_mcp;
REVOKE ALL ON FUNCTION public.academy_redeem_pilot_invitation(text, uuid) FROM PUBLIC, academy_app, academy_mcp;
GRANT EXECUTE ON FUNCTION public.academy_preview_pilot_invitation(text, uuid) TO academy_app;
GRANT EXECUTE ON FUNCTION public.academy_redeem_pilot_invitation(text, uuid) TO academy_app;

INSERT INTO public.academy_schema_migrations(version)
VALUES ('004_academy_pilot_invitations') ON CONFLICT DO NOTHING;

