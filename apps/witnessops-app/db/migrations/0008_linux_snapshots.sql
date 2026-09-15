-- Derived cache only. Existing completed P1 sources remain untouched.
ALTER TABLE linux_check_sources ADD COLUMN derived_snapshot jsonb;
ALTER TABLE linux_check_sources ADD CONSTRAINT linux_snapshot_schema CHECK (
  derived_snapshot IS NULL OR (jsonb_typeof(derived_snapshot)='object'
    AND derived_snapshot->>'schema' IS NOT NULL
    AND derived_snapshot->>'schema'='witnessops.linux_server_snapshot.v1')
);
-- Existing source immutability also protects this cache. Old rows derive on
-- reopen rather than bypassing the immutable-source trigger for a backfill.
