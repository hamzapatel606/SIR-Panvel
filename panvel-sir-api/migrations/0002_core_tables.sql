-- ============================================================
-- SIR Panvel API
-- Migration 0002: Core Tables
-- ============================================================

-- ------------------------------------------------------------
-- PARTS
-- ------------------------------------------------------------

CREATE TABLE parts (
    part_id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id INTEGER NOT NULL,
    part_no INTEGER NOT NULL,
    part_name TEXT NULL,
    record_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL
        CHECK (status IN ('PREPARING', 'READY', 'ERROR')),

    FOREIGN KEY (dataset_id)
        REFERENCES dataset_versions(dataset_id)
        ON DELETE CASCADE,

    UNIQUE (dataset_id, part_no)
);

CREATE INDEX idx_parts_dataset_status
ON parts(dataset_id, status);

CREATE INDEX idx_parts_dataset_part_no
ON parts(dataset_id, part_no);


-- ------------------------------------------------------------
-- SOURCE FILES
-- ------------------------------------------------------------

CREATE TABLE source_files (
    source_file_id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id INTEGER NOT NULL,
    part_id INTEGER NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NULL,
    checksum TEXT NULL,
    imported_at TEXT NULL,

    FOREIGN KEY (dataset_id)
        REFERENCES dataset_versions(dataset_id)
        ON DELETE CASCADE,

    FOREIGN KEY (part_id)
        REFERENCES parts(part_id)
        ON DELETE SET NULL
);

CREATE INDEX idx_source_files_dataset
ON source_files(dataset_id);

CREATE INDEX idx_source_files_part
ON source_files(part_id);


-- ------------------------------------------------------------
-- PDF DOCUMENTS
-- ------------------------------------------------------------

CREATE TABLE pdf_documents (
    pdf_id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id INTEGER NOT NULL,
    source_file_id INTEGER NULL,
    r2_key TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    page_count INTEGER NOT NULL,
    checksum TEXT NULL,
    status TEXT NOT NULL
        CHECK (status IN ('READY', 'ERROR')),

    FOREIGN KEY (part_id)
        REFERENCES parts(part_id)
        ON DELETE CASCADE,

    FOREIGN KEY (source_file_id)
        REFERENCES source_files(source_file_id)
        ON DELETE SET NULL
);

CREATE INDEX idx_pdf_documents_part
ON pdf_documents(part_id);


-- ------------------------------------------------------------
-- DRAFT RECORDS
-- ------------------------------------------------------------

CREATE TABLE draft_records (
    draft_record_id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id INTEGER NOT NULL,

    sr_no INTEGER NOT NULL,
    epic_no TEXT NOT NULL,
    name TEXT NOT NULL,

    relation_type TEXT NULL,
    relative_name TEXT NULL,
    house_number TEXT NULL,

    age INTEGER NULL,
    gender TEXT NULL,

    pdf_id INTEGER NOT NULL,
    pdf_page INTEGER NOT NULL,
    pdf_box TEXT NULL,

    grid_row INTEGER NULL,
    grid_col INTEGER NULL,

    source_file_id INTEGER NOT NULL,

    FOREIGN KEY (part_id)
        REFERENCES parts(part_id)
        ON DELETE CASCADE,

    FOREIGN KEY (pdf_id)
        REFERENCES pdf_documents(pdf_id)
        ON DELETE RESTRICT,

    FOREIGN KEY (source_file_id)
        REFERENCES source_files(source_file_id)
        ON DELETE RESTRICT,

    CHECK (sr_no >= 1),
    CHECK (age IS NULL OR age >= 0),
    CHECK (pdf_page >= 1)
);

CREATE INDEX idx_draft_part_serial
ON draft_records(part_id, sr_no, draft_record_id);

CREATE INDEX idx_draft_epic
ON draft_records(epic_no);

CREATE INDEX idx_draft_pdf
ON draft_records(pdf_id);


-- ------------------------------------------------------------
-- ASDD RECORDS
-- ------------------------------------------------------------

CREATE TABLE asdd_records (
    asdd_record_id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id INTEGER NOT NULL,

    serial_no INTEGER NOT NULL,
    epic_no TEXT NOT NULL,
    name TEXT NOT NULL,

    relative_details_raw TEXT NULL,
    relative_name TEXT NULL,
    relation_type TEXT NULL,

    age INTEGER NULL,
    reference_epic TEXT NULL,

    uncollectable_reason_raw TEXT NOT NULL,
    uncollectable_reason_code TEXT NOT NULL,

    pdf_id INTEGER NOT NULL,
    pdf_page INTEGER NOT NULL,
    pdf_box TEXT NULL,

    source_file_id INTEGER NOT NULL,

    FOREIGN KEY (part_id)
        REFERENCES parts(part_id)
        ON DELETE CASCADE,

    FOREIGN KEY (pdf_id)
        REFERENCES pdf_documents(pdf_id)
        ON DELETE RESTRICT,

    FOREIGN KEY (source_file_id)
        REFERENCES source_files(source_file_id)
        ON DELETE RESTRICT,

    CHECK (serial_no >= 1),
    CHECK (age IS NULL OR age >= 0),
    CHECK (pdf_page >= 1)
);

CREATE INDEX idx_asdd_part_serial
ON asdd_records(part_id, serial_no, asdd_record_id);

CREATE INDEX idx_asdd_epic
ON asdd_records(epic_no);

CREATE INDEX idx_asdd_pdf
ON asdd_records(pdf_id);


-- ------------------------------------------------------------
-- DISCREPANCY RECORDS
-- ------------------------------------------------------------

CREATE TABLE discrepancy_records (
    discrepancy_record_id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id INTEGER NOT NULL,

    part_serial_number INTEGER NOT NULL,
    epic_no TEXT NOT NULL,
    name TEXT NOT NULL,

    age INTEGER NULL,
    gender TEXT NULL,

    reason_raw TEXT NOT NULL,

    pdf_id INTEGER NOT NULL,
    pdf_page INTEGER NOT NULL,
    pdf_box TEXT NULL,

    source_file_id INTEGER NOT NULL,

    FOREIGN KEY (part_id)
        REFERENCES parts(part_id)
        ON DELETE CASCADE,

    FOREIGN KEY (pdf_id)
        REFERENCES pdf_documents(pdf_id)
        ON DELETE RESTRICT,

    FOREIGN KEY (source_file_id)
        REFERENCES source_files(source_file_id)
        ON DELETE RESTRICT,

    CHECK (part_serial_number >= 1),
    CHECK (age IS NULL OR age >= 0),
    CHECK (pdf_page >= 1)
);

CREATE INDEX idx_discrepancy_part_serial
ON discrepancy_records(
    part_id,
    part_serial_number,
    discrepancy_record_id
);

CREATE INDEX idx_discrepancy_epic
ON discrepancy_records(epic_no);

CREATE INDEX idx_discrepancy_pdf
ON discrepancy_records(pdf_id);


-- ------------------------------------------------------------
-- DISCREPANCY REASONS
-- ------------------------------------------------------------

CREATE TABLE discrepancy_reasons (
    reason_id INTEGER PRIMARY KEY AUTOINCREMENT,
    reason_code TEXT NOT NULL UNIQUE,
    reason_name TEXT NOT NULL UNIQUE,
    is_active INTEGER NOT NULL DEFAULT 1
        CHECK (is_active IN (0, 1))
);


-- ------------------------------------------------------------
-- DISCREPANCY RECORD ↔ REASON
-- ------------------------------------------------------------

CREATE TABLE discrepancy_record_reasons (
    discrepancy_record_id INTEGER NOT NULL,
    reason_id INTEGER NOT NULL,

    PRIMARY KEY (
        discrepancy_record_id,
        reason_id
    ),

    FOREIGN KEY (discrepancy_record_id)
        REFERENCES discrepancy_records(discrepancy_record_id)
        ON DELETE CASCADE,

    FOREIGN KEY (reason_id)
        REFERENCES discrepancy_reasons(reason_id)
        ON DELETE RESTRICT
);