-- Per-user UI preferences for non-dentist accounts (e.g., EMPLOYEE).
-- Dentist preferences remain in `dentist_profiles`.

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id BIGINT PRIMARY KEY,
    working_hours_mode VARCHAR(20) DEFAULT 'standard',
    working_hours_start VARCHAR(5) DEFAULT '08:00',
    working_hours_end VARCHAR(5) DEFAULT '17:00',
    time_format VARCHAR(10) DEFAULT '24h',
    date_format VARCHAR(20) DEFAULT 'dd/mm/yyyy',
    money_format VARCHAR(20) DEFAULT 'space',
    currency_label VARCHAR(5) DEFAULT 'DA',
    CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

