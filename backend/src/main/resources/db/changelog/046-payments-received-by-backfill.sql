-- Backfill missing "received_by" on payments so MetadataInfo can show "Créé par".
-- Older rows may have NULL received_by even though an actor existed.

-- Best-effort: use patient's updated_by or created_by as fallback.
UPDATE payments p
SET received_by = COALESCE(p.received_by, pat.updated_by, pat.created_by)
FROM patients pat
WHERE p.patient_id = pat.id
  AND p.received_by IS NULL;

-- Ensure FK exists (best-effort, idempotent).
DO $$
BEGIN
    ALTER TABLE payments
        ADD CONSTRAINT fk_payments_received_by FOREIGN KEY (received_by) REFERENCES users(id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

