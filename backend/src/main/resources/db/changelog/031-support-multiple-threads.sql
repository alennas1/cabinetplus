-- Allow multiple support threads per clinic owner (drop unique constraint)
alter table if exists support_threads
    drop constraint if exists support_threads_clinic_owner_id_key;

alter table if exists support_threads
    drop constraint if exists uk_support_threads_clinic_owner_id;

create index if not exists idx_support_threads_clinic_owner_id on support_threads(clinic_owner_id);

-- Store first message preview for stable thread title
alter table if exists support_threads
    add column if not exists first_message_at timestamp null;

alter table if exists support_threads
    add column if not exists first_message_preview text null;

