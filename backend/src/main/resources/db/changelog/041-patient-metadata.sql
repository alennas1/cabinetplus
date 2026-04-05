-- Add metadata columns for patients so the UI can show:
-- - "Mis à jour" (updatedAt/updatedBy)
-- - "Archivé" (archivedAt/archivedBy)

ALTER TABLE patients
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_by BIGINT,
    ADD COLUMN IF NOT EXISTS archived_by BIGINT;

ALTER TABLE patients
    ADD CONSTRAINT fk_patients_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);

ALTER TABLE patients
    ADD CONSTRAINT fk_patients_archived_by FOREIGN KEY (archived_by) REFERENCES users(id);

-- Backfill so existing rows show something meaningful in metadata.
UPDATE patients
SET updated_at = COALESCE(updated_at, created_at)
WHERE updated_at IS NULL;

UPDATE patients
SET updated_by = COALESCE(updated_by, created_by)
WHERE updated_by IS NULL;

UPDATE patients
SET archived_by = COALESCE(archived_by, updated_by, created_by)
WHERE archived_at IS NOT NULL
  AND archived_by IS NULL;
