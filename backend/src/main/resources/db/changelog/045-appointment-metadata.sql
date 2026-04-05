-- Add metadata columns for appointments (patient dossier needs MetadataInfo fields).

ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS created_by BIGINT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_by BIGINT,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS cancelled_by BIGINT,
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

DO $$
BEGIN
    ALTER TABLE appointments
        ADD CONSTRAINT fk_appointments_created_by FOREIGN KEY (created_by) REFERENCES users(id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE appointments
        ADD CONSTRAINT fk_appointments_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE appointments
        ADD CONSTRAINT fk_appointments_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Backfill: best-effort defaults.
UPDATE appointments
SET created_at = COALESCE(created_at, date_time_start)
WHERE created_at IS NULL;

UPDATE appointments
SET updated_at = COALESCE(updated_at, created_at)
WHERE updated_at IS NULL;

UPDATE appointments
SET created_by = COALESCE(created_by, practitioner_id)
WHERE created_by IS NULL;

UPDATE appointments
SET updated_by = COALESCE(updated_by, created_by)
WHERE updated_by IS NULL;
