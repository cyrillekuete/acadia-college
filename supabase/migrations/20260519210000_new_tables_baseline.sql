-- New tables from database.sql (source of truth).
-- Old PascalCase tables (User, StudentProfile, etc.) remain untouched for backward
-- compatibility until all modules are migrated in follow-up PRs.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- users
-- Mirrors database.sql with two additions for Acadia's
-- multi-tenant setup:
--   • tenant_id  – scopes the user to an institution
--   • password_hash is NULLABLE because credentials live in
--     Supabase Auth; the column exists only to match the spec.
-- id is set == auth.users.id at provisioning time.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL,
  email character varying NOT NULL UNIQUE,
  password_hash character varying,
  name character varying NOT NULL,
  role character varying NOT NULL
    CHECK (role = ANY (ARRAY['admin','teacher','student','parent','bursar'])),
  status character varying NOT NULL DEFAULT 'active'
    CHECK (status = ANY (ARRAY['active','inactive','suspended'])),
  avatar_url text,
  phone character varying,
  address text,
  date_of_birth date,
  gender character varying
    CHECK (gender IS NULL OR gender = ANY (ARRAY['male','female','other'])),
  permissions text[],
  has_default_password boolean NOT NULL DEFAULT true,
  password_last_changed timestamp with time zone NOT NULL DEFAULT now(),
  password_expiry_date timestamp with time zone,
  last_login timestamp with time zone,
  tenant_id text NOT NULL REFERENCES public."Tenant"(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.users(id),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- ============================================================
-- user_profiles
-- Extended per-role data; role_specific_id links to
-- students.student_id (or teachers.employee_id, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_specific_id character varying UNIQUE,
  subsystem character varying
    CHECK (subsystem IS NULL OR subsystem = ANY (ARRAY['english','french'])),
  branch character varying
    CHECK (branch IS NULL OR branch = ANY (ARRAY['grammar','technical','commercial'])),
  class_name character varying,
  occupation character varying,
  relationship character varying
    CHECK (relationship IS NULL OR relationship = ANY (ARRAY['father','mother','guardian','other'])),
  emergency_contact_name character varying,
  emergency_contact_phone character varying,
  emergency_contact_relationship character varying,
  blood_group character varying,
  allergies text,
  medical_conditions text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id)
);

-- ============================================================
-- classes
-- NOTE: class_teacher_id FK to teachers omitted here;
-- teachers table will be added in a follow-up migration.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.classes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  level character varying,
  section character varying,
  subsystem character varying
    CHECK (subsystem IS NULL OR subsystem = ANY (ARRAY['english','french'])),
  subject character varying,
  student_count integer DEFAULT 0,
  schedule text,
  class_teacher_id uuid,
  academic_year character varying,
  capacity integer DEFAULT 40,
  status character varying DEFAULT 'active'
    CHECK (status = ANY (ARRAY['active','inactive'])),
  class_name character varying,
  class_level character varying,
  stream character varying,
  current_enrollment integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT classes_pkey PRIMARY KEY (id)
);

-- ============================================================
-- students
-- ============================================================
CREATE TABLE IF NOT EXISTS public.students (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id character varying NOT NULL UNIQUE,
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  middle_name character varying,
  email character varying,
  phone character varying,
  date_of_birth date,
  gender character varying
    CHECK (gender IS NULL OR gender = ANY (ARRAY['male','female','other'])),
  place_of_birth character varying,
  nationality character varying DEFAULT 'Cameroonian',
  religion character varying,
  address text,
  city character varying,
  region character varying,
  subsystem character varying
    CHECK (subsystem IS NULL OR subsystem = ANY (ARRAY['english','french'])),
  branch character varying
    CHECK (branch IS NULL OR branch = ANY (ARRAY['grammar','technical','commercial'])),
  class character varying,
  previous_school character varying,
  previous_class character varying,
  is_new_student boolean DEFAULT true,
  total_fees numeric DEFAULT 0,
  paid_fees numeric DEFAULT 0,
  fees_status character varying DEFAULT 'pending',
  enrollment_status character varying DEFAULT 'pending',
  academic_year character varying,
  status character varying DEFAULT 'active',
  enrollment_date date DEFAULT CURRENT_DATE,
  class_id character varying,
  class_name character varying,
  matricule_number character varying,
  tenant_id text NOT NULL REFERENCES public."Tenant"(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT students_pkey PRIMARY KEY (id)
);

-- ============================================================
-- parents
-- parents.student_id → students.student_id (varchar business key)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.parents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  parent_code character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  email character varying,
  phone character varying,
  address text,
  occupation character varying,
  relationship character varying
    CHECK (relationship IS NULL OR relationship = ANY (ARRAY['father','mother','guardian','other'])),
  student_id character varying NOT NULL
    REFERENCES public.students(student_id) ON DELETE CASCADE,
  tenant_id text NOT NULL REFERENCES public."Tenant"(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT parents_pkey PRIMARY KEY (id)
);

-- ============================================================
-- class_students  (student enrollment in a class)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.class_students (
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  CONSTRAINT class_students_pkey PRIMARY KEY (class_id, student_id)
);

-- ============================================================
-- emergency_contacts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  name character varying NOT NULL,
  phone character varying NOT NULL,
  relationship character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT emergency_contacts_pkey PRIMARY KEY (id)
);

-- ============================================================
-- medical_info
-- ============================================================
CREATE TABLE IF NOT EXISTS public.medical_info (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  blood_group character varying,
  allergies text,
  medical_conditions text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT medical_info_pkey PRIMARY KEY (id)
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_info ENABLE ROW LEVEL SECURITY;

-- Helpers reuse the existing acadia_is_admin() function from prior migrations.
-- Admin full access
CREATE POLICY "users_admin_all" ON public.users
  FOR ALL TO authenticated USING (acadia_is_admin()) WITH CHECK (acadia_is_admin());

CREATE POLICY "users_read_own" ON public.users
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "user_profiles_admin_all" ON public.user_profiles
  FOR ALL TO authenticated USING (acadia_is_admin()) WITH CHECK (acadia_is_admin());

CREATE POLICY "user_profiles_read_own" ON public.user_profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "classes_admin_all" ON public.classes
  FOR ALL TO authenticated USING (acadia_is_admin()) WITH CHECK (acadia_is_admin());

CREATE POLICY "classes_read_all" ON public.classes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "students_admin_all" ON public.students
  FOR ALL TO authenticated USING (acadia_is_admin()) WITH CHECK (acadia_is_admin());

CREATE POLICY "students_read_own" ON public.students
  FOR SELECT TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "parents_admin_all" ON public.parents
  FOR ALL TO authenticated USING (acadia_is_admin()) WITH CHECK (acadia_is_admin());

CREATE POLICY "parents_read_own" ON public.parents
  FOR SELECT TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "class_students_admin_all" ON public.class_students
  FOR ALL TO authenticated USING (acadia_is_admin()) WITH CHECK (acadia_is_admin());

CREATE POLICY "class_students_read_all" ON public.class_students
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "emergency_contacts_admin_all" ON public.emergency_contacts
  FOR ALL TO authenticated USING (acadia_is_admin()) WITH CHECK (acadia_is_admin());

CREATE POLICY "emergency_contacts_read_own" ON public.emergency_contacts
  FOR SELECT TO authenticated
  USING (student_id IN (
    SELECT s.id FROM public.students s
    WHERE s.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ));

CREATE POLICY "medical_info_admin_all" ON public.medical_info
  FOR ALL TO authenticated USING (acadia_is_admin()) WITH CHECK (acadia_is_admin());

CREATE POLICY "medical_info_read_own" ON public.medical_info
  FOR SELECT TO authenticated
  USING (student_id IN (
    SELECT s.id FROM public.students s
    WHERE s.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ));
