ALTER TABLE payments
    ADD COLUMN record_status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN cancelled_at TIMESTAMP;

ALTER TABLE treatments
    ADD COLUMN record_status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN cancelled_at TIMESTAMP;

ALTER TABLE protheses
    ADD COLUMN record_status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN cancelled_at TIMESTAMP;

ALTER TABLE prescriptions
    ADD COLUMN record_status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN cancelled_at TIMESTAMP;

ALTER TABLE justifications
    ADD COLUMN record_status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN cancelled_at TIMESTAMP;

ALTER TABLE documents
    ADD COLUMN record_status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN cancelled_at TIMESTAMP;

ALTER TABLE fournisseur_payments
    ADD COLUMN record_status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN cancelled_at TIMESTAMP;

ALTER TABLE laboratory_payments
    ADD COLUMN record_status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN cancelled_at TIMESTAMP;

ALTER TABLE fournisseurs
    ADD COLUMN record_status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN archived_at TIMESTAMP;

ALTER TABLE laboratories
    ADD COLUMN record_status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN archived_at TIMESTAMP;

ALTER TABLE employees
    ADD COLUMN record_status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN archived_at TIMESTAMP;

