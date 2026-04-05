-- Add cancellation metadata for patient dossier tables (payments/treatments/protheses).
-- This allows the UI metadata tooltip to show "Annulé ... par ... (motif ...)".

ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS cancelled_by BIGINT,
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

ALTER TABLE treatments
    ADD COLUMN IF NOT EXISTS cancelled_by BIGINT,
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

ALTER TABLE protheses
    ADD COLUMN IF NOT EXISTS cancelled_by BIGINT,
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

DO $$
BEGIN
    ALTER TABLE payments
        ADD CONSTRAINT fk_payments_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE treatments
        ADD CONSTRAINT fk_treatments_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE protheses
        ADD CONSTRAINT fk_protheses_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
