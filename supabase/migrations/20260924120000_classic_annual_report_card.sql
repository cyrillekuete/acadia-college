-- Classic annual bulletin may be stored on the annual template column only.

ALTER TABLE public."ReportCardTemplatePreference"
  DROP CONSTRAINT IF EXISTS "ReportCardTemplatePreference_annualTemplate_check";

ALTER TABLE public."ReportCardTemplatePreference"
  ADD CONSTRAINT "ReportCardTemplatePreference_annualTemplate_check"
  CHECK ("annualTemplate" IN ('sequence', 'yearSummary', 'classicTerm', 'classicAnnual'));
