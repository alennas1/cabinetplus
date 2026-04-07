create table if not exists messaging_threads (
    id bigserial primary key,
    user1_id bigint not null references users(id) on delete cascade,
    user2_id bigint not null references users(id) on delete cascade,
    created_at timestamp,
    updated_at timestamp,
    user1_last_read_at timestamp,
    user2_last_read_at timestamp,
    first_message_at timestamp,
    last_message_at timestamp,
    last_message_preview text,
    constraint uk_messaging_threads_users unique (user1_id, user2_id)
);

create index if not exists idx_messaging_threads_user1 on messaging_threads(user1_id);
create index if not exists idx_messaging_threads_user2 on messaging_threads(user2_id);
create index if not exists idx_messaging_threads_last_message_at on messaging_threads(last_message_at desc);

create table if not exists messaging_messages (
    id bigserial primary key,
    thread_id bigint not null references messaging_threads(id) on delete cascade,
    sender_id bigint not null references users(id) on delete cascade,
    content text not null,
    created_at timestamp
);

create index if not exists idx_messaging_messages_thread_created_at on messaging_messages(thread_id, created_at);
