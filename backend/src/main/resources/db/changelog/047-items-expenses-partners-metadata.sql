-- Add cancellation + metadata support for cabinet management tables.
-- - Items/expenses: allow cancellation instead of deletion (record_status + cancelled_* + reason)
-- - Fournisseurs/laboratories: add created_at so list tables can show metadata

-- Items
ALTER TABLE items
    ADD COLUMN IF NOT EXISTS record_status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS cancelled_by BIGINT,
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

DO $$
BEGIN
    ALTER TABLE items
        ADD CONSTRAINT fk_items_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Expenses
ALTER TABLE expenses
    ADD COLUMN IF NOT EXISTS record_status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS cancelled_by BIGINT,
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

DO $$
BEGIN
    ALTER TABLE expenses
        ADD CONSTRAINT fk_expenses_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Partners metadata
ALTER TABLE fournisseurs
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();

ALTER TABLE laboratories
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
