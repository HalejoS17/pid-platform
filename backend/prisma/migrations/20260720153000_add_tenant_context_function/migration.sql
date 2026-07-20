-- =========================================================
-- PID TENANT CONTEXT
-- Must run before migrations that create tenant RLS policies.
-- =========================================================

CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $function$
  SELECT NULLIF(
    current_setting(
      'app.current_organization_id',
      true
    ),
    ''
  )::uuid
$function$;

REVOKE ALL
ON FUNCTION app.current_organization_id()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION app.current_organization_id()
TO pid_migrator, pid_app, pid_worker;