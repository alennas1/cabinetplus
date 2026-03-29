-- Allow scheduling a future plan change that starts when the current plan ends.
ALTER TABLE users
    ADD COLUMN plan_billing_cycle VARCHAR(16),
    ADD COLUMN next_plan_id BIGINT,
    ADD COLUMN next_plan_billing_cycle VARCHAR(16),
    ADD COLUMN next_plan_start_date TIMESTAMP,
    ADD COLUMN next_plan_expiration_date TIMESTAMP;

ALTER TABLE users
    ADD CONSTRAINT fk_users_next_plan
        FOREIGN KEY (next_plan_id) REFERENCES plans(id);

