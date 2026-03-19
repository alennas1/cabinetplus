-- Some environments were bootstrapped before `custom_type` existed on `justification_contents`.
-- Hibernate runs with ddl-auto=validate in prod, so ensure the column exists.

ALTER TABLE IF EXISTS public.justification_contents
    ADD COLUMN IF NOT EXISTS custom_type character varying(255);

