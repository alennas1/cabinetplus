-- Add PRETE (ready) to persisted workflow status domain.

ALTER TABLE public.protheses
    DROP CONSTRAINT IF EXISTS protheses_status_domain;

ALTER TABLE public.protheses
    ADD CONSTRAINT protheses_status_domain
        CHECK (status IS NOT NULL AND status IN ('PENDING', 'SENT_TO_LAB', 'PRETE', 'RECEIVED', 'FITTED', 'CANCELLED')) NOT VALID;

ALTER TABLE public.protheses
    VALIDATE CONSTRAINT protheses_status_domain;

