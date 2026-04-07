-- Multiple file attachments per prothesis (encrypted on disk).

CREATE TABLE IF NOT EXISTS prothesis_files (
    id BIGSERIAL PRIMARY KEY,
    prothesis_id BIGINT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    relative_path VARCHAR(1024),
    file_type VARCHAR(100),
    file_size_bytes BIGINT,
    uploaded_at TIMESTAMP,
    path_or_url TEXT NOT NULL,
    uploaded_by BIGINT,
    CONSTRAINT fk_prothesis_files_prothesis FOREIGN KEY (prothesis_id) REFERENCES protheses(id) ON DELETE CASCADE,
    CONSTRAINT fk_prothesis_files_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS ix_prothesis_files_prothesis_id ON prothesis_files (prothesis_id);
CREATE INDEX IF NOT EXISTS ix_prothesis_files_uploaded_at ON prothesis_files (uploaded_at);

