-- Drop legacy username identifier and use phone_number as the unique login principal.
-- NOTE: This will invalidate existing JWT/refresh tokens that used username as the subject.

ALTER TABLE public.users
    DROP CONSTRAINT IF EXISTS ukr43af9ap4edm43mmtq01oddj6;

ALTER TABLE public.users
    DROP CONSTRAINT IF EXISTS users_username_key;

ALTER TABLE public.users
    DROP COLUMN IF EXISTS username;

-- Enforce phone number as the unique identifier (multiple NULLs are not allowed).
ALTER TABLE public.users
    ALTER COLUMN phone_number SET NOT NULL;

ALTER TABLE public.users
    ADD CONSTRAINT users_phone_number_unique UNIQUE (phone_number);

