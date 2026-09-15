CREATE TABLE dataset_versions (
    dataset_id INTEGER PRIMARY KEY AUTOINCREMENT,
    version_code TEXT NOT NULL UNIQUE,
    version_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_one_active_version
ON dataset_versions(status)
WHERE status = 'ACTIVE';