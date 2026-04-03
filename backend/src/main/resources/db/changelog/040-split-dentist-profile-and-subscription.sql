-- Split dentist-only columns out of `users` into dedicated tables.
-- This keeps ADMIN and EMPLOYEE rows minimal and avoids dentist-specific NULL columns on everyone.

-- If these relations already exist (from a previous manual attempt or a partial migration),
-- recreate them to guarantee the expected schema.
-- Note: previous attempts may have created views/materialized views with these names, so drop those too.
DROP MATERIALIZED VIEW IF EXISTS dentist_subscriptions CASCADE;
DROP VIEW IF EXISTS dentist_subscriptions CASCADE;
DROP TABLE IF EXISTS dentist_subscriptions CASCADE;

DROP MATERIALIZED VIEW IF EXISTS dentist_profiles CASCADE;
DROP VIEW IF EXISTS dentist_profiles CASCADE;
DROP TABLE IF EXISTS dentist_profiles CASCADE;

CREATE TABLE dentist_profiles (
    user_id BIGINT PRIMARY KEY,
    clinic_name TEXT,
    address TEXT,
    gestion_cabinet_pin_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    gestion_cabinet_pin_hash VARCHAR(100),
    gestion_cabinet_pin_updated_at TIMESTAMP,
    working_hours_mode VARCHAR(20) DEFAULT 'standard',
    working_hours_start VARCHAR(5) DEFAULT '08:00',
    working_hours_end VARCHAR(5) DEFAULT '17:00',
    time_format VARCHAR(10) DEFAULT '24h',
    date_format VARCHAR(20) DEFAULT 'dd/mm/yyyy',
    money_format VARCHAR(20) DEFAULT 'space',
    currency_label VARCHAR(5) DEFAULT 'DA',
    patient_cancelled_appointments_threshold INTEGER DEFAULT 0,
    patient_money_owed_threshold DOUBLE PRECISION DEFAULT 0.0,
    CONSTRAINT fk_dentist_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE dentist_subscriptions (
    dentist_user_id BIGINT PRIMARY KEY,
    plan_id BIGINT,
    plan_billing_cycle VARCHAR(16),
    plan_start_date TIMESTAMP,
    expiration_date TIMESTAMP,
    plan_status VARCHAR(255) DEFAULT 'PENDING',
    next_plan_id BIGINT,
    next_plan_billing_cycle VARCHAR(16),
    next_plan_start_date TIMESTAMP,
    next_plan_expiration_date TIMESTAMP,
    CONSTRAINT fk_dentist_subscriptions_user FOREIGN KEY (dentist_user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_dentist_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES plans (id),
    CONSTRAINT fk_dentist_subscriptions_next_plan FOREIGN KEY (next_plan_id) REFERENCES plans (id),
    CONSTRAINT dentist_subscriptions_plan_status_check CHECK (
        ((plan_status)::text = ANY ((ARRAY[
            'PENDING'::character varying,
            'WAITING'::character varying,
            'ACTIVE'::character varying,
            'INACTIVE'::character varying
        ])::text[]))
    )
);

-- Best-effort migration from legacy columns without referencing them directly.
-- `to_jsonb(u)->>'column_name'` returns NULL when the column does not exist.
INSERT INTO dentist_profiles (
    user_id,
    clinic_name,
    address,
    gestion_cabinet_pin_enabled,
    gestion_cabinet_pin_hash,
    gestion_cabinet_pin_updated_at,
    working_hours_mode,
    working_hours_start,
    working_hours_end,
    time_format,
    date_format,
    money_format,
    currency_label,
    patient_cancelled_appointments_threshold,
    patient_money_owed_threshold
)
SELECT
    u.id,
    to_jsonb(u)->>'clinic_name',
    to_jsonb(u)->>'address',
    COALESCE((to_jsonb(u)->>'gestion_cabinet_pin_enabled')::boolean, FALSE),
    to_jsonb(u)->>'gestion_cabinet_pin_hash',
    (to_jsonb(u)->>'gestion_cabinet_pin_updated_at')::timestamp,
    to_jsonb(u)->>'working_hours_mode',
    to_jsonb(u)->>'working_hours_start',
    to_jsonb(u)->>'working_hours_end',
    to_jsonb(u)->>'time_format',
    to_jsonb(u)->>'date_format',
    to_jsonb(u)->>'money_format',
    to_jsonb(u)->>'currency_label',
    COALESCE((to_jsonb(u)->>'patient_cancelled_appointments_threshold')::integer, 0),
    COALESCE((to_jsonb(u)->>'patient_money_owed_threshold')::double precision, 0.0)
FROM users u
WHERE (to_jsonb(u)->>'role') = 'DENTIST'
  AND (to_jsonb(u)->>'owner_dentist_id') IS NULL
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO dentist_subscriptions (
    dentist_user_id,
    plan_id,
    plan_billing_cycle,
    plan_start_date,
    expiration_date,
    plan_status,
    next_plan_id,
    next_plan_billing_cycle,
    next_plan_start_date,
    next_plan_expiration_date
)
SELECT
    u.id,
    (to_jsonb(u)->>'plan_id')::bigint,
    to_jsonb(u)->>'plan_billing_cycle',
    (to_jsonb(u)->>'plan_start_date')::timestamp,
    (to_jsonb(u)->>'expiration_date')::timestamp,
    COALESCE(to_jsonb(u)->>'plan_status', 'PENDING'),
    (to_jsonb(u)->>'next_plan_id')::bigint,
    to_jsonb(u)->>'next_plan_billing_cycle',
    (to_jsonb(u)->>'next_plan_start_date')::timestamp,
    (to_jsonb(u)->>'next_plan_expiration_date')::timestamp
FROM users u
WHERE (to_jsonb(u)->>'role') = 'DENTIST'
  AND (to_jsonb(u)->>'owner_dentist_id') IS NULL
ON CONFLICT (dentist_user_id) DO NOTHING;

-- Drop legacy dentist-only columns from users (safe if already removed).
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_plan_status_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_next_plan;

ALTER TABLE users DROP COLUMN IF EXISTS clinic_name CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS address CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS gestion_cabinet_pin_enabled CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS gestion_cabinet_pin_hash CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS gestion_cabinet_pin_updated_at CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS working_hours_mode CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS working_hours_start CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS working_hours_end CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS time_format CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS date_format CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS money_format CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS currency_label CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS patient_cancelled_appointments_threshold CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS patient_money_owed_threshold CASCADE;

ALTER TABLE users DROP COLUMN IF EXISTS plan_id CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS plan_billing_cycle CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS plan_start_date CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS expiration_date CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS plan_status CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS next_plan_id CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS next_plan_billing_cycle CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS next_plan_start_date CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS next_plan_expiration_date CASCADE;
