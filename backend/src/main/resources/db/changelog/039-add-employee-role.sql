-- Allow EMPLOYEE as a valid `users.role` value.
-- Note: `users.role` is a VARCHAR with a CHECK constraint (not a DB enum).

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
    ADD CONSTRAINT users_role_check CHECK (
        ((role)::text = ANY ((ARRAY[
            'DENTIST'::character varying,
            'ADMIN'::character varying,
            'EMPLOYEE'::character varying
        ])::text[]))
    );

-- Migrate legacy staff accounts (previously stored as role=DENTIST + owner_dentist_id) to EMPLOYEE.
UPDATE users
SET role = 'EMPLOYEE'
WHERE owner_dentist_id IS NOT NULL
  AND role = 'DENTIST';

-- Drop legacy clinic access roles (ASSISTANT/RECEPTION/PARTNER_DENTIST).
ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_clinic_access_role_check;

ALTER TABLE users
    DROP COLUMN IF EXISTS clinic_access_role;
