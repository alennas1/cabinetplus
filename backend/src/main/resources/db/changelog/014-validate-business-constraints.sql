-- Validate previously-added constraints so existing rows must comply too.
-- This turns "NOT VALID" guardrails into fully-enforced invariants.

-- Appointments + expenses
ALTER TABLE public.expenses VALIDATE CONSTRAINT expenses_category_check;
ALTER TABLE public.expenses VALIDATE CONSTRAINT chk_expenses_amount_positive;
ALTER TABLE public.expenses VALIDATE CONSTRAINT chk_expenses_title_not_blank;
ALTER TABLE public.expenses VALIDATE CONSTRAINT chk_expenses_employee_category;

ALTER TABLE public.appointments VALIDATE CONSTRAINT chk_appointments_start_not_null;
ALTER TABLE public.appointments VALIDATE CONSTRAINT chk_appointments_end_not_null;
ALTER TABLE public.appointments VALIDATE CONSTRAINT chk_appointments_status_not_null;
ALTER TABLE public.appointments VALIDATE CONSTRAINT chk_appointments_patient_not_null;
ALTER TABLE public.appointments VALIDATE CONSTRAINT chk_appointments_practitioner_not_null;
ALTER TABLE public.appointments VALIDATE CONSTRAINT chk_appointments_end_after_start;

-- Patients
ALTER TABLE public.patients VALIDATE CONSTRAINT chk_patients_created_by_not_null;
ALTER TABLE public.patients VALIDATE CONSTRAINT chk_patients_created_at_not_null;
ALTER TABLE public.patients VALIDATE CONSTRAINT chk_patients_firstname_not_null;
ALTER TABLE public.patients VALIDATE CONSTRAINT chk_patients_lastname_not_null;
ALTER TABLE public.patients VALIDATE CONSTRAINT chk_patients_phone_not_null;
ALTER TABLE public.patients VALIDATE CONSTRAINT chk_patients_sex_not_null;
ALTER TABLE public.patients VALIDATE CONSTRAINT chk_patients_age_range;
ALTER TABLE public.patients VALIDATE CONSTRAINT chk_patients_sex_domain;

-- Treatments
ALTER TABLE public.treatments VALIDATE CONSTRAINT treatments_patient_not_null;
ALTER TABLE public.treatments VALIDATE CONSTRAINT treatments_practitioner_not_null;
ALTER TABLE public.treatments VALIDATE CONSTRAINT treatments_catalog_not_null;
ALTER TABLE public.treatments VALIDATE CONSTRAINT treatments_date_not_null;
ALTER TABLE public.treatments VALIDATE CONSTRAINT treatments_price_positive;
ALTER TABLE public.treatments VALIDATE CONSTRAINT treatments_status_domain;
ALTER TABLE public.treatment_teeth VALIDATE CONSTRAINT treatment_teeth_tooth_number_range;

-- Protheses
ALTER TABLE public.protheses VALIDATE CONSTRAINT protheses_patient_not_null;
ALTER TABLE public.protheses VALIDATE CONSTRAINT protheses_practitioner_not_null;
ALTER TABLE public.protheses VALIDATE CONSTRAINT protheses_catalog_not_null;
ALTER TABLE public.protheses VALIDATE CONSTRAINT protheses_date_created_not_null;
ALTER TABLE public.protheses VALIDATE CONSTRAINT protheses_status_domain;
ALTER TABLE public.protheses VALIDATE CONSTRAINT protheses_final_price_non_negative;
ALTER TABLE public.protheses VALIDATE CONSTRAINT protheses_lab_cost_non_negative;
ALTER TABLE public.protheses VALIDATE CONSTRAINT protheses_final_price_gte_lab_cost;
ALTER TABLE public.prothesis_teeth VALIDATE CONSTRAINT prothesis_teeth_tooth_number_range;

-- Catalogs
ALTER TABLE public.treatment_catalog VALIDATE CONSTRAINT treatment_catalog_name_not_blank;
ALTER TABLE public.treatment_catalog VALIDATE CONSTRAINT treatment_catalog_default_price_positive;

ALTER TABLE public.prothesis_catalog VALIDATE CONSTRAINT prothesis_catalog_name_not_blank;
ALTER TABLE public.prothesis_catalog VALIDATE CONSTRAINT prothesis_catalog_default_price_positive;
ALTER TABLE public.prothesis_catalog VALIDATE CONSTRAINT prothesis_catalog_default_lab_cost_non_negative;

-- Items
ALTER TABLE public.item_defaults VALIDATE CONSTRAINT item_defaults_name_not_blank;
ALTER TABLE public.items VALIDATE CONSTRAINT items_quantity_positive;
ALTER TABLE public.items VALIDATE CONSTRAINT items_unit_price_positive;
ALTER TABLE public.items VALIDATE CONSTRAINT items_price_non_negative;
ALTER TABLE public.items VALIDATE CONSTRAINT items_created_at_not_null;

