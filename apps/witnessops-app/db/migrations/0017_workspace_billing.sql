CREATE TABLE workspace_billing (
 workspace_id uuid PRIMARY KEY REFERENCES workspaces(id),
 customer_id text UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 subscription_id text UNIQUE,
 subscription_status text NOT NULL DEFAULT 'free',
 plan_key text,
 seats integer NOT NULL DEFAULT 1 CHECK (seats BETWEEN 1 AND 100),
 paid_until timestamptz,
 cancel_at_period_end boolean NOT NULL DEFAULT false,
 reconciled_at timestamptz,
 checkout_key uuid,
 checkout_plan text,
 checkout_started_at timestamptz,
 checkout_session text
);
CREATE TABLE billing_events (
 event_id text PRIMARY KEY,
 workspace_id uuid NOT NULL REFERENCES workspaces(id),
 processed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE workspace_complimentary_access (
 workspace_id uuid PRIMARY KEY REFERENCES workspaces(id),
 seats integer NOT NULL CHECK (seats BETWEEN 2 AND 100),
 expires_at timestamptz NOT NULL,
 reason text NOT NULL CHECK (length(reason) BETWEEN 1 AND 500),
 issued_by text NOT NULL CHECK (length(issued_by) BETWEEN 1 AND 100),
 updated_at timestamptz NOT NULL DEFAULT now()
);
