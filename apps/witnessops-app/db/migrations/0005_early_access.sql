ALTER TABLE users ADD COLUMN early_access_state text
  CHECK (early_access_state IN ('invited', 'active', 'paused'));
ALTER TABLE users ADD COLUMN early_access_activated_at timestamptz;
-- Preserve only an explicitly named existing member. Never infer a cohort from
-- all existing accounts, and refuse to lock them out without an operator choice.
DO $$
DECLARE preserved text := nullif(current_setting('witnessops.preserve_member', true), '');
BEGIN
  IF EXISTS (SELECT 1 FROM memberships WHERE status='active' AND revoked_at IS NULL) AND preserved IS NULL THEN
    RAISE EXCEPTION 'Name the existing member to preserve with --preserve-member before migration';
  END IF;
  IF preserved IS NOT NULL THEN
    UPDATE users u SET early_access_state='active', early_access_activated_at=now()
    WHERE u.id::text=preserved AND u.status='active' AND EXISTS (
      SELECT 1 FROM memberships m JOIN workspaces w ON w.id=m.workspace_id
      WHERE m.user_id=u.id AND m.status='active' AND m.revoked_at IS NULL AND w.status='active'
    );
    IF NOT FOUND THEN RAISE EXCEPTION 'The preserved user must be an existing active workspace member'; END IF;
  END IF;
END;
$$;

CREATE TABLE product_events (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  workspace_id uuid REFERENCES workspaces(id),
  asset_id uuid REFERENCES assets(id),
  run_id uuid REFERENCES runs(id),
  name text NOT NULL CHECK (name IN ('early_access_activated','asset_added','observation_started','observation_completed','observation_failed','observation_opened','evidence_opened','report_opened','pdf_export_requested','source_json_downloaded','rerun_started','comparison_viewed','feedback_submitted','deeper_review_clicked')),
  check_id text CHECK (char_length(check_id) <= 100),
  dedupe_key text NOT NULL UNIQUE CHECK (char_length(dedupe_key) <= 240),
  app_version text NOT NULL DEFAULT 'external-exposure-ea-v1',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_events_cohort_idx ON product_events (created_at, name, user_id);
CREATE TABLE product_feedback (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  user_id uuid NOT NULL REFERENCES users(id),
  run_id uuid NOT NULL REFERENCES runs(id),
  surface text NOT NULL CHECK (surface IN ('first_run','comparison')),
  response text NOT NULL CHECK (response IN ('yes','not_really','dismissed')),
  comment text CHECK (char_length(comment) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id, surface),
  CHECK (response <> 'dismissed' OR comment IS NULL)
);
