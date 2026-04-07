-- Store an optional STL file attachment per prothesis (encrypted on disk).

ALTER TABLE protheses
    ADD COLUMN IF NOT EXISTS stl_filename VARCHAR(255),
    ADD COLUMN IF NOT EXISTS stl_file_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS stl_file_size_bytes BIGINT,
    ADD COLUMN IF NOT EXISTS stl_uploaded_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS stl_path_or_url TEXT,
    ADD COLUMN IF NOT EXISTS stl_uploaded_by BIGINT;

DO $$
BEGIN
    ALTER TABLE protheses
        ADD CONSTRAINT fk_protheses_stl_uploaded_by FOREIGN KEY (stl_uploaded_by) REFERENCES users(id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

