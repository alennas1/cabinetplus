create table if not exists push_subscriptions (
    id bigserial primary key,
    user_id bigint not null references users(id) on delete cascade,
    endpoint text not null,
    p256dh text not null,
    auth text not null,
    created_at timestamp,
    updated_at timestamp,
    constraint uk_push_subscriptions_user_endpoint unique (user_id, endpoint)
);

create index if not exists idx_push_subscriptions_user_id on push_subscriptions(user_id);

