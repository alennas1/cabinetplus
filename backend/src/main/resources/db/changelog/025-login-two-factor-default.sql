-- Enable login 2-step verification by default for all users.
-- Safe because login 2FA uses the user's login phone number (not a separate verified contact).

ALTER TABLE public.users
    ALTER COLUMN login_two_factor_enabled SET DEFAULT true;

UPDATE public.users
SET login_two_factor_enabled = true
WHERE login_two_factor_enabled IS DISTINCT FROM true;

