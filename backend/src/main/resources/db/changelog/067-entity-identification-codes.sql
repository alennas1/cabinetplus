-- Add internal, date-sequenced reference codes to primary entities.
-- Also rename Prothesis.code (lab code) -> Prothesis.lab_code, and introduce a new Prothesis.code (internal).

ALTER TABLE public.patients
    ADD COLUMN code character varying(32);

ALTER TABLE public.treatments
    ADD COLUMN code character varying(32);

ALTER TABLE public.appointments
    ADD COLUMN code character varying(32);

ALTER TABLE public.payments
    ADD COLUMN code character varying(32);

ALTER TABLE public.payments
    ADD COLUMN created_at timestamp(6) without time zone;

UPDATE public.payments
SET created_at = COALESCE(date, now())
WHERE created_at IS NULL;

ALTER TABLE public.payments
    ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE public.justifications
    ADD COLUMN code character varying(32);

ALTER TABLE public.justifications
    ADD COLUMN created_at timestamp(6) without time zone;

UPDATE public.justifications
SET created_at = COALESCE(date, now())
WHERE created_at IS NULL;

ALTER TABLE public.justifications
    ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE public.documents
    ADD COLUMN code character varying(32);

ALTER TABLE public.protheses
    RENAME COLUMN code TO lab_code;

ALTER TABLE public.protheses
    ADD COLUMN code character varying(32);
