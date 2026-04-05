-- Track who performed key workflow transitions for protheses:
-- - sent to lab (sent_to_lab_by)
-- - received from lab (received_by)

ALTER TABLE protheses
    ADD COLUMN IF NOT EXISTS sent_to_lab_by BIGINT,
    ADD COLUMN IF NOT EXISTS received_by BIGINT;

DO $$
BEGIN
    ALTER TABLE protheses
        ADD CONSTRAINT fk_protheses_sent_to_lab_by FOREIGN KEY (sent_to_lab_by) REFERENCES users(id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE protheses
        ADD CONSTRAINT fk_protheses_received_by FOREIGN KEY (received_by) REFERENCES users(id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Best-effort backfill for existing data.
UPDATE protheses
SET sent_to_lab_by = COALESCE(sent_to_lab_by, updated_by, practitioner_id)
WHERE sent_to_lab_date IS NOT NULL
  AND sent_to_lab_by IS NULL;

UPDATE protheses
SET received_by = COALESCE(received_by, updated_by, practitioner_id)
WHERE actual_return_date IS NOT NULL
  AND received_by IS NULL;
