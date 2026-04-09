-- Support threads: separate chats per clinic member (employee vs dentist)
alter table if exists support_threads
    add column if not exists requester_id bigint null references users(id);

-- Backfill existing data: legacy threads belong to the clinic owner
update support_threads
set requester_id = clinic_owner_id
where requester_id is null;

alter table if exists support_threads
    alter column requester_id set not null;

create index if not exists idx_support_threads_requester_id on support_threads(requester_id);
create index if not exists idx_support_threads_clinic_owner_requester_id on support_threads(clinic_owner_id, requester_id);
