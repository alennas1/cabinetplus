-- Justification.title is now encrypted (envelope format), so it must be stored as TEXT
-- to avoid truncation (ciphertext is longer than plaintext).

ALTER TABLE public.justifications
    ALTER COLUMN title TYPE text;

