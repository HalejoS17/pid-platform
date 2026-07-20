DO $$
DECLARE
  migration_schema text;
BEGIN
  SELECT table_schema
  INTO migration_schema
  FROM information_schema.tables
  WHERE table_name = '_prisma_migrations'
  ORDER BY
    CASE
      WHEN table_schema = 'public' THEN 0
      ELSE 1
    END
  LIMIT 1;

  IF migration_schema IS NOT NULL THEN
    EXECUTE format(
      'TRUNCATE TABLE %I."_prisma_migrations"',
      migration_schema
    );
  END IF;
END
$$;