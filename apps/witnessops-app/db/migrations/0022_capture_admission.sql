-- Quiesce older app writers before applying and keep them stopped afterward.
-- Every pre-migration execution could own a rejected/partial capture absent from
-- capture_bytes. Charge the full historical 25 MiB bound, including terminal rows.
-- Adding the constant default backfills without rewriting immutable source rows.
ALTER TABLE server_check_executions ADD COLUMN capture_reserved_bytes bigint NOT NULL DEFAULT 26214400
 CHECK(capture_reserved_bytes BETWEEN 0 AND 26214400);
ALTER TABLE server_check_executions ALTER COLUMN capture_reserved_bytes SET DEFAULT 0;
ALTER TABLE server_check_executions ADD COLUMN capture_reserved_digest text
 CHECK(capture_reserved_digest ~ '^[a-f0-9]{64}$');
ALTER TABLE server_check_executions ADD CONSTRAINT capture_storage_admitted
 CHECK(capture_bytes IS NULL OR octet_length(capture_bytes)<=capture_reserved_bytes);
CREATE FUNCTION preserve_capture_reservation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.capture_reserved_bytes < OLD.capture_reserved_bytes
 OR (OLD.capture_reserved_digest IS NOT NULL AND NEW.capture_reserved_digest IS DISTINCT FROM OLD.capture_reserved_digest)
 OR (NEW.capture_bytes IS NOT NULL AND NEW.capture_reserved_digest IS NOT NULL AND NEW.capture_digest IS DISTINCT FROM NEW.capture_reserved_digest)
 THEN RAISE EXCEPTION 'Capture reservation is retained' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER capture_reservation_custody BEFORE UPDATE ON server_check_executions
 FOR EACH ROW EXECUTE FUNCTION preserve_capture_reservation();
