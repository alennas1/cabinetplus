alter table if exists support_threads
    add column if not exists clinic_last_read_at timestamp null;

alter table if exists support_threads
    add column if not exists admin_last_read_at timestamp null;

