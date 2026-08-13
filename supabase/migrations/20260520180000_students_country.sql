ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS country character varying DEFAULT 'Cameroon';
