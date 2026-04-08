alter table messaging_threads
    add column if not exists last_message_sender_id bigint references users(id) on delete set null;

create index if not exists idx_messaging_threads_last_message_sender_id on messaging_threads(last_message_sender_id);

-- Backfill from existing messages (latest message per thread).
update messaging_threads t
set last_message_sender_id = sub.sender_id
from (
    select distinct on (thread_id)
           thread_id,
           sender_id
    from messaging_messages
    order by thread_id, created_at desc, id desc
) sub
where sub.thread_id = t.id
  and t.last_message_sender_id is null;

