-- Per-owner uniqueness constraints (DB-level) to prevent race-condition duplicates.
-- Uses case-insensitive and trim-normalized expressions for user-facing names.

CREATE UNIQUE INDEX IF NOT EXISTS ux_materials_created_by_name_ci
    ON public.materials (created_by, lower(btrim(name)));

CREATE UNIQUE INDEX IF NOT EXISTS ux_laboratories_created_by_name_ci
    ON public.laboratories (created_by, lower(btrim(name)));

CREATE UNIQUE INDEX IF NOT EXISTS ux_item_defaults_created_by_name_ci
    ON public.item_defaults (created_by, lower(btrim(name)));

CREATE UNIQUE INDEX IF NOT EXISTS ux_treatment_catalog_created_by_name_ci
    ON public.treatment_catalog (created_by, lower(btrim(name)));

CREATE UNIQUE INDEX IF NOT EXISTS ux_prothesis_catalog_created_by_name_ci
    ON public.prothesis_catalog (created_by, lower(btrim(name)));

CREATE UNIQUE INDEX IF NOT EXISTS ux_medications_created_by_name_strength_ci
    ON public.medications (
        created_by,
        lower(btrim(name)),
        coalesce(lower(btrim(strength)), '')
    );

