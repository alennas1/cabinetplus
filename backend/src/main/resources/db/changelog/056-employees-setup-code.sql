-- Add a short numeric setup code for employee onboarding (shareable like an invite ID).
-- PostgreSQL

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS setup_code VARCHAR(12);

-- Unique when present (some existing rows will be backfilled lazily by the app).
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_setup_code
  ON employees(setup_code)
  WHERE setup_code IS NOT NULL;

