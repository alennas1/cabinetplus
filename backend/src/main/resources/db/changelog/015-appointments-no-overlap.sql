-- Prevent overlapping appointments per practitioner at the database level.
-- This protects against race conditions / concurrent requests.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_no_overlap_per_practitioner
    EXCLUDE USING gist (
        practitioner_id WITH =,
        tsrange(date_time_start, date_time_end, '[)') WITH &&
    )
    WHERE (status IS NULL OR status <> 'CANCELLED')
    DEFERRABLE INITIALLY DEFERRED;
