-- One active membership is one reserved seat, including Owners and Viewers whose
-- account/cohort access is paused. Revocation releases a seat; login state does not.
-- Preserve all existing memberships, roles, plans, consent and evidence. Existing
-- over-cap plans may reduce membership and update contributions, but cannot grow.
-- No invitation, ownership transfer, automatic enrollment or member selection.

CREATE FUNCTION enforce_plan_enrollment_seats() RETURNS trigger LANGUAGE plpgsql VOLATILE AS $$
BEGIN
  -- A transaction snapshot taken before waiting on the lock cannot safely count
  -- later committed memberships. Keep this admission on fresh statement snapshots.
  IF current_setting('transaction_isolation') NOT IN ('read committed','read uncommitted') THEN
    RAISE EXCEPTION 'Seat admission requires READ COMMITTED isolation' USING ERRCODE='0A000';
  END IF;
  -- Shared with application plan consent, source admission and membership grants.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.workspace_id::text, 0));
  -- Enrollment precedes its deferred consent FK. This is the one-seat contract
  -- of early-access-2026-09-17; a future seat policy needs an explicit migration.
  IF (SELECT count(*) FROM memberships WHERE workspace_id=NEW.workspace_id
      AND status='active' AND revoked_at IS NULL) > 1 THEN
    RAISE EXCEPTION 'Workspace seat limit reached; reconcile memberships before enrollment'
      USING ERRCODE='23514', CONSTRAINT='early_access_workspace_seat_limit';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER plan_enrollment_seats BEFORE INSERT ON early_access_plans
FOR EACH ROW EXECUTE FUNCTION enforce_plan_enrollment_seats();

CREATE FUNCTION enforce_membership_seats() RETURNS trigger LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  accepted_version text;
  seat_limit jsonb;
BEGIN
  IF NEW.status <> 'active' OR NEW.revoked_at IS NOT NULL THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND OLD.status='active' AND OLD.revoked_at IS NULL
    AND OLD.workspace_id=NEW.workspace_id THEN
    -- Role changes and edits to an already active membership add no seat.
    RETURN NEW;
  END IF;
  IF current_setting('transaction_isolation') NOT IN ('read committed','read uncommitted') THEN
    RAISE EXCEPTION 'Seat admission requires READ COMMITTED isolation' USING ERRCODE='0A000';
  END IF;
  -- Lock even without a plan: enrollment must not race a legacy membership grant.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.workspace_id::text, 0));
  IF TG_OP='INSERT' AND EXISTS (SELECT 1 FROM memberships
      WHERE workspace_id=NEW.workspace_id AND user_id=NEW.user_id
      AND status='active' AND revoked_at IS NULL) THEN
    -- Idempotent INSERT ... ON CONFLICT may keep the same occupied seat. Any
    -- subsequent UPDATE that activates/moves a membership runs this guard again.
    RETURN NEW;
  END IF;
  SELECT c.terms_version,t.terms->'limits'->'seats' INTO accepted_version,seat_limit
    FROM early_access_plans p
    LEFT JOIN early_access_plan_consents c ON c.workspace_id=p.workspace_id AND c.revision=p.revision
    LEFT JOIN early_access_plan_terms t ON t.version=c.terms_version
    WHERE p.workspace_id=NEW.workspace_id;
  IF NOT FOUND THEN RETURN NEW; END IF; -- Unenrolled cohort keeps legacy admission.
  IF accepted_version IS DISTINCT FROM 'early-access-2026-09-17'
    OR seat_limit IS DISTINCT FROM '1'::jsonb THEN
    RAISE EXCEPTION 'Accepted seat policy is unavailable'
      USING ERRCODE='23514', CONSTRAINT='early_access_workspace_seat_policy';
  END IF;
  IF (SELECT count(*) FROM memberships WHERE workspace_id=NEW.workspace_id
      AND status='active' AND revoked_at IS NULL) >= 1 THEN
    RAISE EXCEPTION 'Workspace seat limit reached; each active Owner or Viewer uses one seat'
      USING ERRCODE='23514', CONSTRAINT='early_access_workspace_seat_limit';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER membership_seats BEFORE INSERT OR UPDATE OF workspace_id,status,revoked_at ON memberships
FOR EACH ROW EXECUTE FUNCTION enforce_membership_seats();
