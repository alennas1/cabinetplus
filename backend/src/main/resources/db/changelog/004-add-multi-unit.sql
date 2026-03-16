ALTER TABLE public.treatment_catalog
  ADD COLUMN IF NOT EXISTS is_multi_unit boolean DEFAULT false NOT NULL;

ALTER TABLE public.prothesis_catalog
  ADD COLUMN IF NOT EXISTS is_multi_unit boolean DEFAULT false NOT NULL;

