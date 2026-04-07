-- Store the moment a laboratory marks a prothesis as ready (PRETE).

ALTER TABLE public.protheses
    ADD COLUMN IF NOT EXISTS ready_at timestamp;

