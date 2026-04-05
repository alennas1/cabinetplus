-- Employee onboarding state
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_setup_completed BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_setup_otp_last_sent_at TIMESTAMP;

-- Per-employee PIN (stored on user row for EMPLOYEE / staff accounts)
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_gestion_cabinet_pin_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_gestion_cabinet_pin_hash VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_gestion_cabinet_pin_updated_at TIMESTAMP;

-- Sidebar permissions
CREATE TABLE IF NOT EXISTS user_permissions (
  user_id BIGINT NOT NULL,
  permission VARCHAR(50) NOT NULL,
  PRIMARY KEY (user_id, permission),
  CONSTRAINT fk_user_permissions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);

