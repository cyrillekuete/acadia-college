-- Wave 7F: major Cameroon examination types (FR-4.2.2)
ALTER TYPE public."ExamSessionType" ADD VALUE IF NOT EXISTS 'GCE';
ALTER TYPE public."ExamSessionType" ADD VALUE IF NOT EXISTS 'BEPC';
ALTER TYPE public."ExamSessionType" ADD VALUE IF NOT EXISTS 'PROBATOIRE';
ALTER TYPE public."ExamSessionType" ADD VALUE IF NOT EXISTS 'BACCALAUREAT';
