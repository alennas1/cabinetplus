-- Some environments were bootstrapped before `type` existed on `justification_contents`.
-- Hibernate runs with ddl-auto=validate in prod, so ensure the column exists and is non-null.

ALTER TABLE IF EXISTS public.justification_contents
    ADD COLUMN IF NOT EXISTS type character varying(255);

UPDATE public.justification_contents
SET type = 'OTHER'
WHERE type IS NULL;

ALTER TABLE public.justification_contents
    ALTER COLUMN type SET NOT NULL;

