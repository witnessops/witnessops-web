-- Tombstones remain after share cleanup: a retired name is never reassigned.
CREATE TABLE report_share_names (
 name text PRIMARY KEY CHECK(name ~ '^[a-z][a-z0-9-]{2,47}$'),
 share_id uuid UNIQUE REFERENCES report_shares(id) ON DELETE SET NULL
);
INSERT INTO report_share_names(name,share_id) SELECT 'r-'||replace(gen_random_uuid()::text,'-',''),id FROM report_shares;
CREATE FUNCTION preserve_report_name() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Reporting names remain reserved'; END IF;
 IF NEW.name<>OLD.name OR (NEW.share_id IS DISTINCT FROM OLD.share_id AND NEW.share_id IS NOT NULL) THEN
  RAISE EXCEPTION 'Reporting names cannot be reassigned';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER report_name_immutable BEFORE UPDATE OR DELETE ON report_share_names FOR EACH ROW EXECUTE FUNCTION preserve_report_name();
