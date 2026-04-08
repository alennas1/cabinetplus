create table if not exists admin_group_messages (
    id bigserial primary key,
    sender_id bigint not null references users(id) on delete cascade,
    content text not null,
    created_at timestamp
);

create index if not exists idx_admin_group_messages_created_at on admin_group_messages(created_at desc);

