CREATE TABLE assets (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  type text NOT NULL CHECK (type IN ('domain', 'hostname')),
  normalized_value text NOT NULL,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, normalized_value),
  UNIQUE (workspace_id, id)
);
