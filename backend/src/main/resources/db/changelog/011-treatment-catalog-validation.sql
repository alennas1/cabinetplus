-- Treatment catalog validation hardening (new constraints only; do not modify old changesets)

-- Enforce required fields for new writes (NOT VALID keeps legacy rows untouched)
ALTER TABLE public.treatment_catalog
    ADD CONSTRAINT treatment_catalog_name_not_blank
        CHECK (name IS NOT NULL AND length(btrim(name)) > 0) NOT VALID;

ALTER TABLE public.treatment_catalog
    ADD CONSTRAINT treatment_catalog_default_price_positive
        CHECK (default_price IS NOT NULL AND default_price > 0) NOT VALID;

