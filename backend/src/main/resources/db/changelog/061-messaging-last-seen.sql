alter table users
    add column if not exists messaging_last_seen_at timestamp;

create index if not exists idx_users_messaging_last_seen_at on users(messaging_last_seen_at);

