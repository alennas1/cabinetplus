-- Add LAB user role + dentist↔lab connection invitations + cancellation confirmation metadata.

-- 1) Allow LAB as a valid `users.role` value (VARCHAR + CHECK constraint).
ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
    ADD CONSTRAINT users_role_check CHECK (
        ((role)::text = ANY ((ARRAY[
            'DENTIST'::character varying,
            'ADMIN'::character varying,
            'EMPLOYEE'::character varying,
            'LAB'::character varying
        ])::text[]))
    );

-- 2) Dentist ↔ lab account connections (invites).
CREATE TABLE IF NOT EXISTS laboratory_connections (
    id BIGSERIAL PRIMARY KEY,
    dentist_id BIGINT NOT NULL,
    laboratory_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    invited_at TIMESTAMP NOT NULL DEFAULT now(),
    responded_at TIMESTAMP NULL,
    merge_from_laboratory_id BIGINT NULL
);

DO $$
BEGIN
    ALTER TABLE laboratory_connections
        ADD CONSTRAINT fk_laboratory_connections_dentist FOREIGN KEY (dentist_id) REFERENCES users(id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE laboratory_connections
        ADD CONSTRAINT fk_laboratory_connections_laboratory FOREIGN KEY (laboratory_id) REFERENCES laboratories(id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE laboratory_connections
        ADD CONSTRAINT fk_laboratory_connections_merge_from_laboratory FOREIGN KEY (merge_from_laboratory_id) REFERENCES laboratories(id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE laboratory_connections
        ADD CONSTRAINT ux_laboratory_connections_dentist_laboratory UNIQUE (dentist_id, laboratory_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE laboratory_connections
        ADD CONSTRAINT laboratory_connections_status_check CHECK (
            (status)::text = ANY ((ARRAY[
                'PENDING'::character varying,
                'ACCEPTED'::character varying,
                'REJECTED'::character varying
            ])::text[])
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_lab_connections_laboratory_status
    ON laboratory_connections (laboratory_id, status);

CREATE INDEX IF NOT EXISTS idx_lab_connections_dentist_status
    ON laboratory_connections (dentist_id, status);

-- 3) Cancellation confirmation metadata (protheses + laboratory_payments).
ALTER TABLE protheses
    ADD COLUMN IF NOT EXISTS cancel_requested_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS cancel_requested_by BIGINT,
    ADD COLUMN IF NOT EXISTS cancel_request_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancel_request_decision VARCHAR(20),
    ADD COLUMN IF NOT EXISTS cancel_request_decided_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS cancel_request_decided_by BIGINT;

ALTER TABLE laboratory_payments
    ADD COLUMN IF NOT EXISTS cancel_requested_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS cancel_requested_by BIGINT,
    ADD COLUMN IF NOT EXISTS cancel_request_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancel_request_decision VARCHAR(20),
    ADD COLUMN IF NOT EXISTS cancel_request_decided_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS cancel_request_decided_by BIGINT;

DO $$
BEGIN
    ALTER TABLE protheses
        ADD CONSTRAINT fk_protheses_cancel_requested_by FOREIGN KEY (cancel_requested_by) REFERENCES users(id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE protheses
        ADD CONSTRAINT fk_protheses_cancel_request_decided_by FOREIGN KEY (cancel_request_decided_by) REFERENCES users(id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE laboratory_payments
        ADD CONSTRAINT fk_laboratory_payments_cancel_requested_by FOREIGN KEY (cancel_requested_by) REFERENCES users(id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE laboratory_payments
        ADD CONSTRAINT fk_laboratory_payments_cancel_request_decided_by FOREIGN KEY (cancel_request_decided_by) REFERENCES users(id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

