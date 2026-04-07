-- Add a simple numeric invite code for laboratories (shareable like an ID).
-- PostgreSQL
--
-- Note: keep this file compatible with Liquibase `splitStatements: true`
-- (avoid DO $$ blocks).

CREATE SEQUENCE IF NOT EXISTS laboratory_invite_code_seq START WITH 10000000 INCREMENT BY 1;

ALTER TABLE laboratories
  ADD COLUMN IF NOT EXISTS invite_code VARCHAR(12);

ALTER TABLE laboratories
  ALTER COLUMN invite_code
  SET DEFAULT to_char(nextval('laboratory_invite_code_seq'), 'FM00000000');

UPDATE laboratories
SET invite_code = to_char(nextval('laboratory_invite_code_seq'), 'FM00000000')
WHERE invite_code IS NULL OR btrim(invite_code) = '';

ALTER TABLE laboratories
  ALTER COLUMN invite_code
  SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_laboratories_invite_code ON laboratories(invite_code);
