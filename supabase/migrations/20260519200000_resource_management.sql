-- Phase 7K: learning materials, school resources, requests, room maintenance

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LearningMaterialKind') THEN
    CREATE TYPE public."LearningMaterialKind" AS ENUM ('DOCUMENT', 'VIDEO', 'LINK', 'OTHER');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SchoolResourceType') THEN
    CREATE TYPE public."SchoolResourceType" AS ENUM (
      'EQUIPMENT',
      'BOOK',
      'LAB',
      'IT',
      'OTHER'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ResourceAllocationStatus') THEN
    CREATE TYPE public."ResourceAllocationStatus" AS ENUM (
      'ACTIVE',
      'RETURNED',
      'OVERDUE'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ResourceRequestStatus') THEN
    CREATE TYPE public."ResourceRequestStatus" AS ENUM (
      'PENDING',
      'APPROVED',
      'REJECTED',
      'FULFILLED',
      'CANCELLED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoomMaintenanceStatus') THEN
    CREATE TYPE public."RoomMaintenanceStatus" AS ENUM (
      'SCHEDULED',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."LearningMaterial" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "titleEn" text NOT NULL,
  "titleFr" text NOT NULL,
  "descriptionEn" text,
  "descriptionFr" text,
  kind public."LearningMaterialKind" NOT NULL DEFAULT 'DOCUMENT'::public."LearningMaterialKind",
  "courseId" text,
  "storageKey" text,
  "externalUrl" text,
  "fileSizeBytes" bigint,
  "mimeType" text,
  "isPublished" boolean NOT NULL DEFAULT true,
  "uploadedByUserId" text NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT "LearningMaterial_pkey" PRIMARY KEY (id),
  CONSTRAINT "LearningMaterial_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "LearningMaterial_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES public."Course"(id),
  CONSTRAINT "LearningMaterial_uploadedByUserId_fkey"
    FOREIGN KEY ("uploadedByUserId") REFERENCES public."User"(id)
);

CREATE TABLE IF NOT EXISTS public."SchoolResource" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  code text NOT NULL,
  "nameEn" text NOT NULL,
  "nameFr" text NOT NULL,
  "resourceType" public."SchoolResourceType" NOT NULL DEFAULT 'OTHER'::public."SchoolResourceType",
  "totalQuantity" integer NOT NULL DEFAULT 1 CHECK ("totalQuantity" > 0),
  location text,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT "SchoolResource_pkey" PRIMARY KEY (id),
  CONSTRAINT "SchoolResource_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "SchoolResource_tenant_code_key" UNIQUE ("tenantId", code)
);

CREATE TABLE IF NOT EXISTS public."ResourceAllocation" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "resourceId" text NOT NULL,
  "allocatedToUserId" text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  "allocatedOn" date NOT NULL,
  "expectedReturnOn" date,
  "returnedAt" timestamp without time zone,
  status public."ResourceAllocationStatus" NOT NULL DEFAULT 'ACTIVE'::public."ResourceAllocationStatus",
  notes text,
  "createdByUserId" text NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT "ResourceAllocation_pkey" PRIMARY KEY (id),
  CONSTRAINT "ResourceAllocation_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "ResourceAllocation_resourceId_fkey"
    FOREIGN KEY ("resourceId") REFERENCES public."SchoolResource"(id),
  CONSTRAINT "ResourceAllocation_allocatedToUserId_fkey"
    FOREIGN KEY ("allocatedToUserId") REFERENCES public."User"(id),
  CONSTRAINT "ResourceAllocation_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id)
);

CREATE TABLE IF NOT EXISTS public."ResourceUsageLog" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "resourceId" text NOT NULL,
  "userId" text NOT NULL,
  "usedOn" date NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  purpose text,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResourceUsageLog_pkey" PRIMARY KEY (id),
  CONSTRAINT "ResourceUsageLog_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "ResourceUsageLog_resourceId_fkey"
    FOREIGN KEY ("resourceId") REFERENCES public."SchoolResource"(id),
  CONSTRAINT "ResourceUsageLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES public."User"(id)
);

CREATE TABLE IF NOT EXISTS public."ResourceRequest" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "resourceId" text NOT NULL,
  "requestedByUserId" text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  purpose text,
  status public."ResourceRequestStatus" NOT NULL DEFAULT 'PENDING'::public."ResourceRequestStatus",
  "reviewedByUserId" text,
  "reviewedAt" timestamp without time zone,
  "reviewNotes" text,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT "ResourceRequest_pkey" PRIMARY KEY (id),
  CONSTRAINT "ResourceRequest_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "ResourceRequest_resourceId_fkey"
    FOREIGN KEY ("resourceId") REFERENCES public."SchoolResource"(id),
  CONSTRAINT "ResourceRequest_requestedByUserId_fkey"
    FOREIGN KEY ("requestedByUserId") REFERENCES public."User"(id),
  CONSTRAINT "ResourceRequest_reviewedByUserId_fkey"
    FOREIGN KEY ("reviewedByUserId") REFERENCES public."User"(id)
);

CREATE TABLE IF NOT EXISTS public."RoomMaintenanceSchedule" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "roomId" text NOT NULL,
  title text NOT NULL,
  description text,
  "scheduledOn" date NOT NULL,
  status public."RoomMaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED'::public."RoomMaintenanceStatus",
  "completedAt" timestamp without time zone,
  "createdByUserId" text NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT "RoomMaintenanceSchedule_pkey" PRIMARY KEY (id),
  CONSTRAINT "RoomMaintenanceSchedule_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "RoomMaintenanceSchedule_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES public."Room"(id),
  CONSTRAINT "RoomMaintenanceSchedule_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id)
);

CREATE INDEX IF NOT EXISTS "LearningMaterial_tenant_published_idx"
  ON public."LearningMaterial" ("tenantId", "isPublished", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "SchoolResource_tenant_active_idx"
  ON public."SchoolResource" ("tenantId", "isActive", code);

CREATE INDEX IF NOT EXISTS "ResourceAllocation_tenant_resource_idx"
  ON public."ResourceAllocation" ("tenantId", "resourceId", status);

CREATE INDEX IF NOT EXISTS "ResourceUsageLog_tenant_resource_idx"
  ON public."ResourceUsageLog" ("tenantId", "resourceId", "usedOn" DESC);

CREATE INDEX IF NOT EXISTS "ResourceRequest_tenant_status_idx"
  ON public."ResourceRequest" ("tenantId", status, "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "RoomMaintenanceSchedule_tenant_room_idx"
  ON public."RoomMaintenanceSchedule" ("tenantId", "roomId", "scheduledOn");

-- Learning materials storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'learning-materials',
  'learning-materials',
  true,
  52428800,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png',
    'image/jpeg',
    'image/webp',
    'video/mp4',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "learning_materials_public_read" ON storage.objects;
CREATE POLICY "learning_materials_public_read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'learning-materials');

DROP POLICY IF EXISTS "learning_materials_authenticated_insert" ON storage.objects;
CREATE POLICY "learning_materials_authenticated_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'learning-materials'
    AND (storage.foldername(name))[1] = public.acadia_current_tenant_id()
  );

DROP POLICY IF EXISTS "learning_materials_authenticated_update" ON storage.objects;
CREATE POLICY "learning_materials_authenticated_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'learning-materials'
    AND (storage.foldername(name))[1] = public.acadia_current_tenant_id()
  );

DROP POLICY IF EXISTS "learning_materials_authenticated_delete" ON storage.objects;
CREATE POLICY "learning_materials_authenticated_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'learning-materials'
    AND (storage.foldername(name))[1] = public.acadia_current_tenant_id()
  );

-- RLS
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'LearningMaterial',
    'SchoolResource',
    'ResourceAllocation',
    'ResourceUsageLog',
    'ResourceRequest',
    'RoomMaintenanceSchedule'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_select_tenant', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ("tenantId" = public.acadia_current_tenant_id())',
      tbl || '_select_tenant',
      tbl
    );
  END LOOP;
END $$;

-- Staff-managed inventory tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'LearningMaterial',
    'SchoolResource',
    'ResourceAllocation',
    'ResourceUsageLog',
    'RoomMaintenanceSchedule'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_insert_staff', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_staff_or_teacher())',
      tbl || '_insert_staff',
      tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_update_staff', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_staff_or_teacher()) WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_staff_or_teacher())',
      tbl || '_update_staff',
      tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_delete_staff', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_staff_or_teacher())',
      tbl || '_delete_staff',
      tbl
    );
  END LOOP;
END $$;

-- Resource requests: any tenant member may submit; staff reviews
DROP POLICY IF EXISTS "ResourceRequest_insert_member" ON public."ResourceRequest";
CREATE POLICY "ResourceRequest_insert_member"
  ON public."ResourceRequest"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND "requestedByUserId" = auth.uid()::text
  );

DROP POLICY IF EXISTS "ResourceRequest_update_staff" ON public."ResourceRequest";
CREATE POLICY "ResourceRequest_update_staff"
  ON public."ResourceRequest"
  FOR UPDATE
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_staff_or_teacher()
      OR "requestedByUserId" = auth.uid()::text
    )
  )
  WITH CHECK ("tenantId" = public.acadia_current_tenant_id());

DROP POLICY IF EXISTS "ResourceRequest_delete_staff" ON public."ResourceRequest";
CREATE POLICY "ResourceRequest_delete_staff"
  ON public."ResourceRequest"
  FOR DELETE
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_staff_or_teacher()
  );
