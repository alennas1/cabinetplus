-- Public UUIDs (UUIDv7) for entities exposed in URLs.
-- Safe for existing DBs: add nullable column, backfill, then enforce NOT NULL + unique.
--
-- NOTE: the UUIDv7 generator function is created in 003a-uuidv7-function.sql.

-- Patients
ALTER TABLE patients ADD COLUMN IF NOT EXISTS public_id uuid;
UPDATE patients SET public_id = cabinetplus_uuid_v7() WHERE public_id IS NULL;
ALTER TABLE patients ALTER COLUMN public_id SET DEFAULT cabinetplus_uuid_v7();
ALTER TABLE patients ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_patients_public_id ON patients(public_id);

-- Prescriptions
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS public_id uuid;
UPDATE prescriptions SET public_id = cabinetplus_uuid_v7() WHERE public_id IS NULL;
ALTER TABLE prescriptions ALTER COLUMN public_id SET DEFAULT cabinetplus_uuid_v7();
ALTER TABLE prescriptions ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_prescriptions_public_id ON prescriptions(public_id);

-- Employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS public_id uuid;
UPDATE employees SET public_id = cabinetplus_uuid_v7() WHERE public_id IS NULL;
ALTER TABLE employees ALTER COLUMN public_id SET DEFAULT cabinetplus_uuid_v7();
ALTER TABLE employees ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_employees_public_id ON employees(public_id);

-- Laboratories
ALTER TABLE laboratories ADD COLUMN IF NOT EXISTS public_id uuid;
UPDATE laboratories SET public_id = cabinetplus_uuid_v7() WHERE public_id IS NULL;
ALTER TABLE laboratories ALTER COLUMN public_id SET DEFAULT cabinetplus_uuid_v7();
ALTER TABLE laboratories ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_laboratories_public_id ON laboratories(public_id);

-- Users
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_id uuid;
UPDATE users SET public_id = cabinetplus_uuid_v7() WHERE public_id IS NULL;
ALTER TABLE users ALTER COLUMN public_id SET DEFAULT cabinetplus_uuid_v7();
ALTER TABLE users ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_public_id ON users(public_id);

-- Justification templates
ALTER TABLE justification_contents ADD COLUMN IF NOT EXISTS public_id uuid;
UPDATE justification_contents SET public_id = cabinetplus_uuid_v7() WHERE public_id IS NULL;
ALTER TABLE justification_contents ALTER COLUMN public_id SET DEFAULT cabinetplus_uuid_v7();
ALTER TABLE justification_contents ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_justification_contents_public_id ON justification_contents(public_id);
