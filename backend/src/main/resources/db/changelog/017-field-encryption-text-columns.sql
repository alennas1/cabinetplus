-- Expand columns that now store encrypted envelopes (base64url strings + header).
-- Using TEXT avoids unexpected truncation as ciphertext is typically larger than plaintext.

ALTER TABLE public.patients
    ALTER COLUMN firstname TYPE text,
    ALTER COLUMN lastname TYPE text,
    ALTER COLUMN phone TYPE text,
    ALTER COLUMN sex TYPE text;

ALTER TABLE public.users
    ALTER COLUMN firstname TYPE text,
    ALTER COLUMN lastname TYPE text,
    ALTER COLUMN clinic_name TYPE text;

ALTER TABLE public.employees
    ALTER COLUMN first_name TYPE text,
    ALTER COLUMN last_name TYPE text,
    ALTER COLUMN gender TYPE text,
    ALTER COLUMN national_id TYPE text,
    ALTER COLUMN phone TYPE text,
    ALTER COLUMN email TYPE text,
    ALTER COLUMN address TYPE text;

ALTER TABLE public.laboratories
    ALTER COLUMN contact_person TYPE text,
    ALTER COLUMN phone_number TYPE text,
    ALTER COLUMN address TYPE text;

ALTER TABLE public.documents
    ALTER COLUMN title TYPE text,
    ALTER COLUMN filename TYPE text;

ALTER TABLE public.appointments
    ALTER COLUMN notes TYPE text;

ALTER TABLE public.treatments
    ALTER COLUMN notes TYPE text;

ALTER TABLE public.prescriptions
    ALTER COLUMN notes TYPE text;

ALTER TABLE public.protheses
    ALTER COLUMN notes TYPE text;

ALTER TABLE public.expenses
    ALTER COLUMN title TYPE text,
    ALTER COLUMN description TYPE text;

ALTER TABLE public.hand_payments
    ALTER COLUMN notes TYPE text;

ALTER TABLE public.laboratory_payments
    ALTER COLUMN notes TYPE text;

