-- Support message attachments (images)
alter table if exists support_messages
    add column if not exists attachment_path text null;

alter table if exists support_messages
    add column if not exists attachment_content_type varchar(255) null;

alter table if exists support_messages
    add column if not exists attachment_original_name text null;

alter table if exists support_messages
    add column if not exists attachment_size bigint null;

