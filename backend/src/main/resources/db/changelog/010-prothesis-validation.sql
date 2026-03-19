-- Prothesis validation hardening (new constraints only; do not modify old changesets)

-- Align notes length with backend validation (500)
ALTER TABLE public.protheses
    ALTER COLUMN notes TYPE character varying(500);

-- Ensure default status is consistent
ALTER TABLE public.protheses
    ALTER COLUMN status SET DEFAULT 'PENDING';

-- Enforce required fields & domains for new writes (NOT VALID keeps legacy rows untouched)
ALTER TABLE public.protheses
    ADD CONSTRAINT protheses_patient_not_null
        CHECK (patient_id IS NOT NULL) NOT VALID;

ALTER TABLE public.protheses
    ADD CONSTRAINT protheses_practitioner_not_null
        CHECK (practitioner_id IS NOT NULL) NOT VALID;

ALTER TABLE public.protheses
    ADD CONSTRAINT protheses_catalog_not_null
        CHECK (prothesis_catalog_id IS NOT NULL) NOT VALID;

ALTER TABLE public.protheses
    ADD CONSTRAINT protheses_date_created_not_null
        CHECK (date_created IS NOT NULL) NOT VALID;

ALTER TABLE public.protheses
    ADD CONSTRAINT protheses_status_domain
        CHECK (status IS NOT NULL AND status IN ('PENDING', 'SENT_TO_LAB', 'RECEIVED', 'FITTED')) NOT VALID;

ALTER TABLE public.protheses
    ADD CONSTRAINT protheses_final_price_non_negative
        CHECK (final_price IS NOT NULL AND final_price >= 0) NOT VALID;

ALTER TABLE public.protheses
    ADD CONSTRAINT protheses_lab_cost_non_negative
        CHECK (lab_cost IS NOT NULL AND lab_cost >= 0) NOT VALID;

ALTER TABLE public.protheses
    ADD CONSTRAINT protheses_final_price_gte_lab_cost
        CHECK (final_price IS NOT NULL AND lab_cost IS NOT NULL AND final_price >= lab_cost) NOT VALID;

-- Teeth collection table: remove invalid legacy rows, then enforce constraints.
DELETE FROM public.prothesis_teeth
WHERE tooth_number IS NULL OR tooth_number < 1 OR tooth_number > 32;

DELETE FROM public.prothesis_teeth a
USING public.prothesis_teeth b
WHERE a.ctid < b.ctid
  AND a.prothesis_id = b.prothesis_id
  AND a.tooth_number = b.tooth_number;

ALTER TABLE public.prothesis_teeth
    ADD CONSTRAINT prothesis_teeth_tooth_number_range
        CHECK (tooth_number IS NOT NULL AND tooth_number BETWEEN 1 AND 32) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS ux_prothesis_teeth_prothesis_tooth
    ON public.prothesis_teeth (prothesis_id, tooth_number);

