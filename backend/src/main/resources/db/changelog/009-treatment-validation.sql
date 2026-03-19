-- Treatment validation hardening (new constraints only; do not modify old changesets)

-- Align notes length with backend validation (500)
ALTER TABLE public.treatments
    ALTER COLUMN notes TYPE character varying(500);

-- Ensure default status is consistent
ALTER TABLE public.treatments
    ALTER COLUMN status SET DEFAULT 'PLANNED';

-- Enforce required fields & domains for new writes (NOT VALID keeps legacy rows untouched)
ALTER TABLE public.treatments
    ADD CONSTRAINT treatments_patient_not_null
        CHECK (patient_id IS NOT NULL) NOT VALID;

ALTER TABLE public.treatments
    ADD CONSTRAINT treatments_practitioner_not_null
        CHECK (practitioner_id IS NOT NULL) NOT VALID;

ALTER TABLE public.treatments
    ADD CONSTRAINT treatments_catalog_not_null
        CHECK (treatment_catalog_id IS NOT NULL) NOT VALID;

ALTER TABLE public.treatments
    ADD CONSTRAINT treatments_date_not_null
        CHECK (date IS NOT NULL) NOT VALID;

ALTER TABLE public.treatments
    ADD CONSTRAINT treatments_price_positive
        CHECK (price IS NOT NULL AND price > 0) NOT VALID;

ALTER TABLE public.treatments
    ADD CONSTRAINT treatments_status_domain
        CHECK (status IS NOT NULL AND status IN ('PLANNED', 'IN_PROGRESS', 'DONE', 'CANCELLED')) NOT VALID;

-- Teeth collection table: remove invalid legacy rows, then enforce constraints.
DELETE FROM public.treatment_teeth
WHERE tooth_number IS NULL OR tooth_number < 1 OR tooth_number > 32;

DELETE FROM public.treatment_teeth a
USING public.treatment_teeth b
WHERE a.ctid < b.ctid
  AND a.treatment_id = b.treatment_id
  AND a.tooth_number = b.tooth_number;

ALTER TABLE public.treatment_teeth
    ADD CONSTRAINT treatment_teeth_tooth_number_range
        CHECK (tooth_number IS NOT NULL AND tooth_number BETWEEN 1 AND 32) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS ux_treatment_teeth_treatment_tooth
    ON public.treatment_teeth (treatment_id, tooth_number);

