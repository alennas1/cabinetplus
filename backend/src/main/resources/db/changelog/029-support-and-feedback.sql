-- Support threads (1 per clinic owner)
create table if not exists support_threads (
    id bigserial primary key,
    clinic_owner_id bigint not null unique references users(id),
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    last_message_at timestamp null,
    last_message_preview text null
);

create index if not exists idx_support_threads_last_message_at on support_threads(last_message_at desc);

-- Support messages
create table if not exists support_messages (
    id bigserial primary key,
    thread_id bigint not null references support_threads(id) on delete cascade,
    sender_id bigint not null references users(id),
    content text not null,
    created_at timestamp not null default now()
);

create index if not exists idx_support_messages_thread_created_at on support_messages(thread_id, created_at);

-- Feedbacks
create table if not exists feedbacks (
    id bigserial primary key,
    clinic_owner_id bigint not null references users(id),
    created_by bigint not null references users(id),
    category varchar(40) not null,
    custom_category_label text null,
    message text not null,
    created_at timestamp not null default now()
);

create index if not exists idx_feedbacks_created_at on feedbacks(created_at desc);
create index if not exists idx_feedbacks_clinic_owner_id on feedbacks(clinic_owner_id);

