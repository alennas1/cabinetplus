-- Add medical history free-form lists to patients.
-- Stored as TEXT (application encrypts/decrypts via EncryptionConverter).

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS diseases TEXT;

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS allergies TEXT;

