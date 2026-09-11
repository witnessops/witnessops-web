CREATE TABLE users (
  id uuid PRIMARY KEY,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE identity_mappings (
  user_id uuid NOT NULL REFERENCES users(id),
  provider text NOT NULL,
  issuer text NOT NULL,
  subject text NOT NULL,
  verified_email_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, issuer, subject)
);
