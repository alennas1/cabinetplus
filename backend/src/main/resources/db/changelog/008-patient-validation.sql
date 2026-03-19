-- Patient validation guardrails (enforce for new rows/updates without breaking legacy data).
-- Notes:
-- - CHECK constraints are added as NOT VALID to avoid blocking if legacy rows are inconsistent.

ALTER TABLE public.patients
  ADD CONSTRAINT chk_patients_created_by_not_null
  CHECK (created_by IS NOT NULL) NOT VALID;

ALTER TABLE public.patients
  ADD CONSTRAINT chk_patients_created_at_not_null
  CHECK (created_at IS NOT NULL) NOT VALID;

ALTER TABLE public.patients
  ADD CONSTRAINT chk_patients_firstname_not_null
  CHECK (firstname IS NOT NULL) NOT VALID;

ALTER TABLE public.patients
  ADD CONSTRAINT chk_patients_lastname_not_null
  CHECK (lastname IS NOT NULL) NOT VALID;

ALTER TABLE public.patients
  ADD CONSTRAINT chk_patients_phone_not_null
  CHECK (phone IS NOT NULL) NOT VALID;

ALTER TABLE public.patients
  ADD CONSTRAINT chk_patients_sex_not_null
  CHECK (sex IS NOT NULL) NOT VALID;

ALTER TABLE public.patients
  ADD CONSTRAINT chk_patients_age_range
  CHECK (age IS NULL OR (age >= 0 AND age <= 120)) NOT VALID;

ALTER TABLE public.patients
  ADD CONSTRAINT chk_patients_sex_domain
  CHECK (sex IN ('Homme', 'Femme')) NOT VALID;

