-- Track when and by whom a prothesis was fitted/posed.

ALTER TABLE protheses
    ADD COLUMN IF NOT EXISTS posed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS posed_by BIGINT;

DO $$
BEGIN
    ALTER TABLE protheses
        ADD CONSTRAINT fk_protheses_posed_by FOREIGN KEY (posed_by) REFERENCES users(id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Best-effort backfill: if status is FITTED, reuse updated_*.
UPDATE protheses
SET posed_at = COALESCE(posed_at, updated_at, date_created)
WHERE upper(coalesce(status, '')) = 'FITTED'
  AND posed_at IS NULL;

UPDATE protheses
SET posed_by = COALESCE(posed_by, updated_by, practitioner_id)
WHERE upper(coalesce(status, '')) = 'FITTED'
  AND posed_by IS NULL;
