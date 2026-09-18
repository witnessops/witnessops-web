-- 0013 is reserved by the paused admission proposal. No historical terms change.
ALTER TABLE users ADD COLUMN free_workspace_access boolean NOT NULL DEFAULT false;
CREATE TABLE free_workspace_plans (
  workspace_id uuid PRIMARY KEY REFERENCES workspaces(id),
  policy_version text NOT NULL CHECK (policy_version='free-workspace-v1'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER free_plan_immutable BEFORE UPDATE OR DELETE ON free_workspace_plans
FOR EACH ROW EXECUTE FUNCTION preserve_plan_consent();
