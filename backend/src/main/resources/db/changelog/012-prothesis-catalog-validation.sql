-- Prothesis catalog validation hardening (new constraints only; do not modify old changesets)

-- Enforce required fields & numeric guardrails for new writes (NOT VALID keeps legacy rows untouched)
ALTER TABLE public.prothesis_catalog
    ADD CONSTRAINT prothesis_catalog_name_not_blank
        CHECK (name IS NOT NULL AND length(btrim(name)) > 0) NOT VALID;

ALTER TABLE public.prothesis_catalog
    ADD CONSTRAINT prothesis_catalog_default_price_positive
        CHECK (default_price IS NOT NULL AND default_price > 0) NOT VALID;

ALTER TABLE public.prothesis_catalog
    ADD CONSTRAINT prothesis_catalog_default_lab_cost_non_negative
        CHECK (default_lab_cost IS NOT NULL AND default_lab_cost >= 0) NOT VALID;

