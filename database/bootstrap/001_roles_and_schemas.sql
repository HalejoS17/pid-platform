\set ON_ERROR_STOP on

-- =========================================================
-- ROLES
-- =========================================================

SELECT format(
  'CREATE ROLE pid_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD %L',
  :'migrator_password'
)
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_roles
  WHERE rolname = 'pid_migrator'
)
\gexec

SELECT format(
  'ALTER ROLE pid_migrator PASSWORD %L',
  :'migrator_password'
)
\gexec

ALTER ROLE pid_migrator
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  NOBYPASSRLS;


SELECT format(
  'CREATE ROLE pid_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD %L',
  :'app_password'
)
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_roles
  WHERE rolname = 'pid_app'
)
\gexec

SELECT format(
  'ALTER ROLE pid_app PASSWORD %L',
  :'app_password'
)
\gexec

ALTER ROLE pid_app
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  NOBYPASSRLS;


SELECT format(
  'CREATE ROLE pid_worker LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD %L',
  :'worker_password'
)
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_roles
  WHERE rolname = 'pid_worker'
)
\gexec

SELECT format(
  'ALTER ROLE pid_worker PASSWORD %L',
  :'worker_password'
)
\gexec

ALTER ROLE pid_worker
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  NOBYPASSRLS;


-- =========================================================
-- DATABASE SECURITY
-- =========================================================

REVOKE ALL
ON DATABASE :"database_name"
FROM PUBLIC;

GRANT CONNECT, CREATE
ON DATABASE :"database_name"
TO pid_migrator;

GRANT CONNECT
ON DATABASE :"database_name"
TO pid_app, pid_worker;

REVOKE CREATE
ON SCHEMA public
FROM PUBLIC;


-- =========================================================
-- EXTENSIONS
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- =========================================================
-- SCHEMAS
-- =========================================================

CREATE SCHEMA IF NOT EXISTS app
  AUTHORIZATION pid_migrator;

CREATE SCHEMA IF NOT EXISTS imports
  AUTHORIZATION pid_migrator;

CREATE SCHEMA IF NOT EXISTS raw
  AUTHORIZATION pid_migrator;

CREATE SCHEMA IF NOT EXISTS core
  AUTHORIZATION pid_migrator;

CREATE SCHEMA IF NOT EXISTS analytics
  AUTHORIZATION pid_migrator;

CREATE SCHEMA IF NOT EXISTS audit
  AUTHORIZATION pid_migrator;


ALTER SCHEMA app OWNER TO pid_migrator;
ALTER SCHEMA imports OWNER TO pid_migrator;
ALTER SCHEMA raw OWNER TO pid_migrator;
ALTER SCHEMA core OWNER TO pid_migrator;
ALTER SCHEMA analytics OWNER TO pid_migrator;
ALTER SCHEMA audit OWNER TO pid_migrator;


REVOKE ALL
ON SCHEMA app, imports, raw, core, analytics, audit
FROM PUBLIC;


-- El backend conoce solamente los esquemas que necesita consultar.
GRANT USAGE
ON SCHEMA app, imports, core, analytics, audit
TO pid_app;


-- El worker procesa archivos y escribe datos analíticos.
GRANT USAGE
ON SCHEMA app, imports, raw, core, analytics, audit
TO pid_worker;


-- =========================================================
-- SEARCH PATH
-- =========================================================

ALTER ROLE pid_migrator
IN DATABASE :"database_name"
SET search_path = app, imports, raw, core, analytics, audit, public;

ALTER ROLE pid_app
IN DATABASE :"database_name"
SET search_path = app, imports, core, analytics, audit, public;

ALTER ROLE pid_worker
IN DATABASE :"database_name"
SET search_path = imports, raw, core, analytics, audit, app, public;


-- =========================================================
-- LIMITES DE SEGURIDAD Y RENDIMIENTO
-- =========================================================

ALTER ROLE pid_app
SET statement_timeout = '15s';

ALTER ROLE pid_app
SET idle_in_transaction_session_timeout = '30s';

ALTER ROLE pid_worker
SET statement_timeout = '5min';

ALTER ROLE pid_worker
SET idle_in_transaction_session_timeout = '2min';
