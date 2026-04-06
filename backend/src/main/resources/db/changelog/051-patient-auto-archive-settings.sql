-- Add patient inactivity auto-archive configuration to dentist profiles.
ALTER TABLE dentist_profiles
    ADD COLUMN IF NOT EXISTS patient_auto_archive_inactive_months INTEGER;

