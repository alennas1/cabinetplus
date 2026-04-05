-- Track "modified at/by" for protheses so patient dossier can show proper metadata.

ALTER TABLE protheses
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_by BIGINT;

DO $$
BEGIN
    ALTER TABLE protheses
        ADD CONSTRAINT fk_protheses_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Backfill for existing rows.
UPDATE protheses
SET updated_at = COALESCE(updated_at, date_created)
WHERE updated_at IS NULL;

UPDATE protheses
SET updated_by = COALESCE(updated_by, practitioner_id)
WHERE updated_by IS NULL;
