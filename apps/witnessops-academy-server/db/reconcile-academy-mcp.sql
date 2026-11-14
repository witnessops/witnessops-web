-- Repeatable. Run on the academy database as a superuser after migrations.
-- Strips every direct grant on academy_mcp, then applies the allowlist:
-- CONNECT, USAGE on public, SELECT/INSERT identities, SELECT/INSERT/UPDATE drafts.
-- No DELETE, no DDL, no session tables, no sequences.
DO $$
DECLARE
  membership text;
  relation record;
  column_list text;
  routine text;
BEGIN
  FOR membership IN
    SELECT granted.rolname
    FROM pg_auth_members member_of
    JOIN pg_roles granted ON granted.oid = member_of.roleid
    JOIN pg_roles grantee ON grantee.oid = member_of.member
    WHERE grantee.rolname = 'academy_mcp'
  LOOP
    EXECUTE format('REVOKE %I FROM academy_mcp', membership);
  END LOOP;

  EXECUTE format('REVOKE ALL ON DATABASE %I FROM academy_mcp', current_database());
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO academy_mcp', current_database());

  EXECUTE 'REVOKE ALL ON SCHEMA public FROM academy_mcp';
  EXECUTE 'GRANT USAGE ON SCHEMA public TO academy_mcp';

  FOR relation IN
    SELECT c.relname, c.relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
  LOOP
    IF relation.relkind = 'S' THEN
      EXECUTE format('REVOKE ALL ON SEQUENCE public.%I FROM academy_mcp', relation.relname);
    ELSE
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM academy_mcp', relation.relname);
      SELECT string_agg(format('%I', a.attname), ', ')
        INTO column_list
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = relation.relname
        AND a.attnum > 0
        AND NOT a.attisdropped;
      IF column_list IS NOT NULL THEN
        EXECUTE format(
          'REVOKE ALL (%s) ON TABLE public.%I FROM academy_mcp',
          column_list,
          relation.relname
        );
      END IF;
    END IF;
  END LOOP;

  FOR routine IN
    SELECT p.oid::regprocedure::text
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM academy_mcp', routine);
  END LOOP;

  EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE academy_migrator IN SCHEMA public REVOKE ALL ON TABLES FROM academy_mcp';
  EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE academy_migrator IN SCHEMA public REVOKE ALL ON SEQUENCES FROM academy_mcp';
  EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE academy_migrator IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM academy_mcp';
  EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM academy_mcp';
  EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM academy_mcp';
  EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM academy_mcp';

  EXECUTE 'GRANT SELECT, INSERT ON TABLE public.academy_identities TO academy_mcp';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE ON TABLE public.academy_lesson_drafts TO academy_mcp';
END $$;
