-- Policy/consent foundation only. No automatic enrollment, access changes,
-- payment authority, allowance enforcement, or evidence expiry.
CREATE TABLE early_access_plan_terms (
  version text PRIMARY KEY,
  terms jsonb NOT NULL CHECK (jsonb_typeof(terms)='object' AND (terms->>'version') IS NOT DISTINCT FROM version)
);
INSERT INTO early_access_plan_terms(version,terms) VALUES ('early-access-2026-09-17', '{
  "version":"early-access-2026-09-17","planId":"early-access","currency":"EUR",
  "contributionInterval":"month","trialDays":7,"suggestedContributionMinor":4900,
  "zeroContributionAllowed":true,"featureAccess":"full","samePlanAfterTrial":true,
  "futurePricingRequiresConsent":true,
  "limits":{"hostnameChecksPerMonth":25,"linuxImportSources":3,"snapshotRetentionDays":90,"seats":1}
}'::jsonb);

CREATE TABLE early_access_plans (
  workspace_id uuid PRIMARY KEY REFERENCES workspaces(id),
  plan_id text NOT NULL DEFAULT 'early-access' CHECK (plan_id='early-access'),
  trial_started_at timestamptz NOT NULL DEFAULT now(),
  trial_ends_at timestamptz NOT NULL DEFAULT (now()+interval '168 hours'),
  revision integer NOT NULL CHECK (revision > 0),
  CHECK (trial_ends_at=trial_started_at+interval '168 hours')
);
CREATE TABLE early_access_plan_consents (
  workspace_id uuid NOT NULL REFERENCES early_access_plans(workspace_id),
  request_id uuid NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  accepted_by uuid NOT NULL REFERENCES users(id),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  terms_version text NOT NULL REFERENCES early_access_plan_terms(version),
  contribution_minor integer NOT NULL CHECK (contribution_minor >= 0),
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency='EUR'),
  contribution_interval text NOT NULL DEFAULT 'month' CHECK (contribution_interval='month'),
  consent_scope text NOT NULL DEFAULT 'contribution_choice' CHECK (consent_scope='contribution_choice'),
  PRIMARY KEY (workspace_id,request_id),
  UNIQUE (workspace_id,revision)
);
ALTER TABLE early_access_plans ADD CONSTRAINT current_plan_consent
  FOREIGN KEY (workspace_id,revision) REFERENCES early_access_plan_consents(workspace_id,revision)
  DEFERRABLE INITIALLY DEFERRED;

CREATE FUNCTION preserve_plan_consent() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Plan terms and consent history are immutable' USING ERRCODE='23514';
END;
$$;
CREATE TRIGGER plan_terms_immutable BEFORE UPDATE OR DELETE ON early_access_plan_terms
FOR EACH ROW EXECUTE FUNCTION preserve_plan_consent();
CREATE TRIGGER plan_consents_immutable BEFORE UPDATE OR DELETE ON early_access_plan_consents
FOR EACH ROW EXECUTE FUNCTION preserve_plan_consent();

CREATE FUNCTION preserve_plan_timeline() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'A plan trial cannot be reset by deleting its record' USING ERRCODE='23514';
  END IF;
  IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id OR NEW.plan_id IS DISTINCT FROM OLD.plan_id
    OR NEW.trial_started_at IS DISTINCT FROM OLD.trial_started_at OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
    OR NEW.revision IS DISTINCT FROM OLD.revision+1 THEN
    RAISE EXCEPTION 'Plan identity and trial are immutable; consent must advance one revision' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER plan_timeline_immutable BEFORE UPDATE OR DELETE ON early_access_plans
FOR EACH ROW EXECUTE FUNCTION preserve_plan_timeline();
