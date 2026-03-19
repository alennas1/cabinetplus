-- Fix critical frontend ↔ database mismatches and add missing numeric guardrails.
-- Notes:
-- - Increasing varchar length is safe and non-breaking.
-- - CHECK constraints are added as NOT VALID to avoid blocking if legacy data is already inconsistent.

-- Align item default description length with frontend (500 chars).
ALTER TABLE public.item_defaults
  ALTER COLUMN description TYPE character varying(500);

-- Align treatment notes length with frontend (500 chars).
ALTER TABLE public.treatments
  ALTER COLUMN notes TYPE character varying(500);

-- Numeric sanity checks (missing in baseline schema).
ALTER TABLE public.item_defaults
  ADD CONSTRAINT chk_item_defaults_default_price
  CHECK (default_price >= 0) NOT VALID;

ALTER TABLE public.treatments
  ADD CONSTRAINT chk_treatments_price
  CHECK (price IS NULL OR price >= 0.01) NOT VALID;

