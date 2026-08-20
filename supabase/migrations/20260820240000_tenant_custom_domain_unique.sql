-- Custom domains must be unique across tenants when set.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'Tenant_customDomain_uidx'
  ) THEN
    BEGIN
      CREATE UNIQUE INDEX "Tenant_customDomain_uidx"
        ON public."Tenant" ("customDomain")
        WHERE "customDomain" IS NOT NULL AND btrim("customDomain") <> '';
    EXCEPTION
      WHEN unique_violation THEN
        RAISE NOTICE 'Skipping Tenant_customDomain_uidx; duplicate custom domains exist';
    END;
  END IF;
END $$;
