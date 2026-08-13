-- Phase 7H: ledger, budget, and RLS for fee tables

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FinanceLedgerEntryType') THEN
    CREATE TYPE public."FinanceLedgerEntryType" AS ENUM ('INCOME', 'EXPENSE');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."FinanceLedgerEntry" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "academicYearId" text NOT NULL,
  "entryType" public."FinanceLedgerEntryType" NOT NULL,
  category text NOT NULL,
  description text,
  "amountMinor" bigint NOT NULL CHECK ("amountMinor" > 0),
  currency text NOT NULL DEFAULT 'XAF',
  "occurredOn" date NOT NULL,
  "createdByUserId" text,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT "FinanceLedgerEntry_pkey" PRIMARY KEY (id),
  CONSTRAINT "FinanceLedgerEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "FinanceLedgerEntry_academicYearId_tenantId_fkey" FOREIGN KEY ("tenantId", "academicYearId") REFERENCES public."AcademicYear"("tenantId", id),
  CONSTRAINT "FinanceLedgerEntry_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id)
);

CREATE TABLE IF NOT EXISTS public."FinanceBudgetLine" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "academicYearId" text NOT NULL,
  category text NOT NULL,
  "budgetedMinor" bigint NOT NULL CHECK ("budgetedMinor" >= 0),
  currency text NOT NULL DEFAULT 'XAF',
  notes text,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT "FinanceBudgetLine_pkey" PRIMARY KEY (id),
  CONSTRAINT "FinanceBudgetLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "FinanceBudgetLine_academicYearId_tenantId_fkey" FOREIGN KEY ("tenantId", "academicYearId") REFERENCES public."AcademicYear"("tenantId", id),
  CONSTRAINT "FinanceBudgetLine_unique_category" UNIQUE ("tenantId", "academicYearId", category)
);

CREATE INDEX IF NOT EXISTS "FinanceLedgerEntry_tenant_year_idx"
  ON public."FinanceLedgerEntry" ("tenantId", "academicYearId", "occurredOn");

CREATE INDEX IF NOT EXISTS "FinanceBudgetLine_tenant_year_idx"
  ON public."FinanceBudgetLine" ("tenantId", "academicYearId");

-- RLS: fee plan + installments + ledger + budget
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'SpecialtyFeePlan',
    'StudentFeeInstallment',
    'FinanceLedgerEntry',
    'FinanceBudgetLine'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_select_tenant', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ("tenantId" = public.acadia_current_tenant_id())',
      tbl || '_select_tenant',
      tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_insert_admin', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar())',
      tbl || '_insert_admin',
      tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_update_admin', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar()) WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar())',
      tbl || '_update_admin',
      tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_delete_admin', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar())',
      tbl || '_delete_admin',
      tbl
    );
  END LOOP;
END $$;
