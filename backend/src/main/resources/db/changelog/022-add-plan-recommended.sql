-- Add a flag to mark one plan as recommended (featured).
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS recommended boolean NOT NULL DEFAULT false;

-- Enforce at most one recommended plan.
-- Partial unique index (PostgreSQL): only applies when recommended is true.
CREATE UNIQUE INDEX IF NOT EXISTS ux_plans_recommended_true
  ON public.plans (recommended)
  WHERE recommended = true;

