-- Patient phone becomes optional.
-- Drop the NOT NULL guardrail so API clients can omit phone (NULL) when creating/updating patients.

ALTER TABLE public.patients
  DROP CONSTRAINT IF EXISTS chk_patients_phone_not_null;

