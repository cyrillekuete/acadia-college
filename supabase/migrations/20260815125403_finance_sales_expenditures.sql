-- Sales (merchandise) and expenditures with tenant-scoped RLS

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FinanceSaleItemType') THEN
    CREATE TYPE public."FinanceSaleItemType" AS ENUM (
      'PULLOVER',
      'SPORT_WEAR',
      'UNIFORM',
      'T_SHIRT',
      'OTHER'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FinanceSaleStatus') THEN
    CREATE TYPE public."FinanceSaleStatus" AS ENUM (
      'COMPLETED',
      'PENDING',
      'CANCELLED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FinancePaymentMethod') THEN
    CREATE TYPE public."FinancePaymentMethod" AS ENUM (
      'CASH',
      'BANK_TRANSFER',
      'MOBILE_MONEY',
      'CHECK',
      'CREDIT_CARD'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExpenditureStatus') THEN
    CREATE TYPE public."ExpenditureStatus" AS ENUM (
      'PENDING',
      'APPROVED',
      'PAID',
      'REJECTED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."FinanceSale" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "academicYearId" text NOT NULL,
  "studentProfileId" text NOT NULL,
  "itemType" public."FinanceSaleItemType" NOT NULL,
  "itemName" text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  "unitPriceMinor" bigint NOT NULL CHECK ("unitPriceMinor" >= 0),
  "totalMinor" bigint NOT NULL CHECK ("totalMinor" >= 0),
  "saleDate" date NOT NULL,
  status public."FinanceSaleStatus" NOT NULL DEFAULT 'COMPLETED',
  notes text,
  "createdByUserId" text,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT "FinanceSale_pkey" PRIMARY KEY (id),
  CONSTRAINT "FinanceSale_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "FinanceSale_academicYearId_tenantId_fkey" FOREIGN KEY ("tenantId", "academicYearId") REFERENCES public."AcademicYear"("tenantId", id),
  CONSTRAINT "FinanceSale_studentProfileId_tenantId_fkey" FOREIGN KEY ("studentProfileId", "tenantId") REFERENCES public."StudentProfile"(id, "tenantId"),
  CONSTRAINT "FinanceSale_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id)
);

CREATE TABLE IF NOT EXISTS public."Expenditure" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "academicYearId" text NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  "amountMinor" bigint NOT NULL CHECK ("amountMinor" > 0),
  currency text NOT NULL DEFAULT 'XAF',
  "paymentMethod" public."FinancePaymentMethod",
  "paymentDate" date NOT NULL,
  vendor text NOT NULL,
  "vendorContact" text,
  "receiptNumber" text,
  "invoiceNumber" text,
  status public."ExpenditureStatus" NOT NULL DEFAULT 'PENDING',
  "budgetCategory" text,
  department text,
  notes text,
  "approvedByUserId" text,
  "approvedAt" timestamp without time zone,
  "createdByUserId" text,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT "Expenditure_pkey" PRIMARY KEY (id),
  CONSTRAINT "Expenditure_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "Expenditure_academicYearId_tenantId_fkey" FOREIGN KEY ("tenantId", "academicYearId") REFERENCES public."AcademicYear"("tenantId", id),
  CONSTRAINT "Expenditure_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES public."User"(id),
  CONSTRAINT "Expenditure_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id)
);

CREATE INDEX IF NOT EXISTS "FinanceSale_tenant_year_idx"
  ON public."FinanceSale" ("tenantId", "academicYearId", "saleDate");

CREATE INDEX IF NOT EXISTS "FinanceSale_tenant_status_idx"
  ON public."FinanceSale" ("tenantId", status);

CREATE INDEX IF NOT EXISTS "Expenditure_tenant_year_idx"
  ON public."Expenditure" ("tenantId", "academicYearId", "paymentDate");

CREATE INDEX IF NOT EXISTS "Expenditure_tenant_status_idx"
  ON public."Expenditure" ("tenantId", status);

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['FinanceSale', 'Expenditure']
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
