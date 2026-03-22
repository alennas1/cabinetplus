-- Add optional login 2-step verification settings + cooldown tracking.
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS login_two_factor_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS login_otp_last_sent_at timestamp(6) without time zone;

