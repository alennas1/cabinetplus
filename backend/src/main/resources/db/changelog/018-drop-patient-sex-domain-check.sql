-- The `sex` column is encrypted at rest (stored as cpenc envelope), so a DB-level
-- CHECK constraint like `sex IN ('Homme','Femme')` will always fail.
-- Keep validation at the API layer (DTO regex) instead.

ALTER TABLE public.patients
  DROP CONSTRAINT IF EXISTS chk_patients_sex_domain;

