-- Support thread claiming / locking by admins
alter table if exists support_threads
    add column if not exists claimed_by_admin_id bigint null references users(id);

alter table if exists support_threads
    add column if not exists claimed_at timestamp null;

alter table if exists support_threads
    add column if not exists finished_at timestamp null;

create index if not exists idx_support_threads_claimed_by_admin_id on support_threads(claimed_by_admin_id);

-- Support system messages
alter table if exists support_messages
    add column if not exists kind varchar(20) not null default 'MESSAGE';

