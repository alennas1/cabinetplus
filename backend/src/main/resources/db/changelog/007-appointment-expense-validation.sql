-- Appointment + expense validation guardrails (frontend <-> backend <-> database).
-- Notes:
-- - Increasing varchar length is safe and non-breaking.
-- - CHECK constraints are added as NOT VALID to avoid blocking if legacy data is already inconsistent.

-- Align appointment notes length with frontend.
ALTER TABLE public.appointments
  ALTER COLUMN notes TYPE character varying(500);

-- Align expense categories with frontend (adds RENT).
ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_category_check;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_category_check
  CHECK (((category)::text = ANY ((ARRAY[
    'OFFICE'::character varying,
    'SUPPLIES'::character varying,
    'RENT'::character varying,
    'UTILITIES'::character varying,
    'SALARY'::character varying,
    'OTHER'::character varying
  ])::text[]))) NOT VALID;

-- Expenses: numeric + content guardrails.
ALTER TABLE public.expenses
  ADD CONSTRAINT chk_expenses_amount_positive
  CHECK (amount > 0) NOT VALID;

ALTER TABLE public.expenses
  ADD CONSTRAINT chk_expenses_title_not_blank
  CHECK (length(btrim(title)) > 0) NOT VALID;

ALTER TABLE public.expenses
  ADD CONSTRAINT chk_expenses_employee_category
  CHECK (
    (category = 'SALARY' AND employee_id IS NOT NULL)
    OR (category <> 'SALARY' AND employee_id IS NULL)
  ) NOT VALID;

-- Appointments: enforce required fields + time range for new rows/updates.
ALTER TABLE public.appointments
  ADD CONSTRAINT chk_appointments_start_not_null
  CHECK (date_time_start IS NOT NULL) NOT VALID;

ALTER TABLE public.appointments
  ADD CONSTRAINT chk_appointments_end_not_null
  CHECK (date_time_end IS NOT NULL) NOT VALID;

ALTER TABLE public.appointments
  ADD CONSTRAINT chk_appointments_status_not_null
  CHECK (status IS NOT NULL) NOT VALID;

ALTER TABLE public.appointments
  ADD CONSTRAINT chk_appointments_patient_not_null
  CHECK (patient_id IS NOT NULL) NOT VALID;

ALTER TABLE public.appointments
  ADD CONSTRAINT chk_appointments_practitioner_not_null
  CHECK (practitioner_id IS NOT NULL) NOT VALID;

ALTER TABLE public.appointments
  ADD CONSTRAINT chk_appointments_end_after_start
  CHECK (date_time_end > date_time_start) NOT VALID;

