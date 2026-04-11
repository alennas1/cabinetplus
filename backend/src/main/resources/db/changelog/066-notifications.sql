create table if not exists notifications (
    id bigserial primary key,
    recipient_user_id bigint not null references users(id) on delete cascade,
    type varchar(50) not null,
    title text,
    body text,
    url text,
    data text,
    created_at timestamp,
    read_at timestamp
);

create index if not exists idx_notifications_recipient_created_at on notifications(recipient_user_id, created_at desc);
create index if not exists idx_notifications_recipient_unread on notifications(recipient_user_id) where read_at is null;

