-- Item validation hardening (new constraints only; do not modify old changesets)

-- Item defaults: prevent blank names for new writes
ALTER TABLE public.item_defaults
    ADD CONSTRAINT item_defaults_name_not_blank
        CHECK (name IS NOT NULL AND length(btrim(name)) > 0) NOT VALID;

-- Items: enforce sane values for new writes
ALTER TABLE public.items
    ADD CONSTRAINT items_quantity_positive
        CHECK (quantity IS NOT NULL AND quantity > 0) NOT VALID;

ALTER TABLE public.items
    ADD CONSTRAINT items_unit_price_positive
        CHECK (unit_price IS NOT NULL AND unit_price > 0) NOT VALID;

ALTER TABLE public.items
    ADD CONSTRAINT items_price_non_negative
        CHECK (price IS NOT NULL AND price >= 0) NOT VALID;

ALTER TABLE public.items
    ADD CONSTRAINT items_created_at_not_null
        CHECK (created_at IS NOT NULL) NOT VALID;

