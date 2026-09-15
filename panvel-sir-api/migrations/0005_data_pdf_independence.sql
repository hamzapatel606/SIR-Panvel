-- ============================================================
-- SIR Panvel API
-- Migration 0005: Independent Data and PDF Availability
-- ============================================================


-- ============================================================
-- 1. DROP FTS TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS draft_records_ai;
DROP TRIGGER IF EXISTS draft_records_ad;
DROP TRIGGER IF EXISTS draft_records_au;

DROP TRIGGER IF EXISTS asdd_records_ai;
DROP TRIGGER IF EXISTS asdd_records_ad;
DROP TRIGGER IF EXISTS asdd_records_au;

DROP TRIGGER IF EXISTS discrepancy_records_ai;
DROP TRIGGER IF EXISTS discrepancy_records_ad;
DROP TRIGGER IF EXISTS discrepancy_records_au;


-- ============================================================
-- 2. DROP DISCREPANCY JUNCTION TABLE
-- ============================================================
-- It references discrepancy_records, so it must be rebuilt
-- after discrepancy_records.

DROP TABLE discrepancy_record_reasons;


-- ============================================================
-- 3. REBUILD PARTS
-- ============================================================

CREATE TABLE parts_new (
    part_id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id INTEGER NOT NULL,
    part_no INTEGER NOT NULL,
    part_name TEXT NULL,
    record_count INTEGER NOT NULL DEFAULT 0,

    status TEXT NOT NULL
        CHECK (
            status IN (
                'NO_DATA',
                'PREPARING',
                'READY',
                'ERROR'
            )
        ),

    FOREIGN KEY (dataset_id)
        REFERENCES dataset_versions(dataset_id)
        ON DELETE CASCADE,

    UNIQUE (dataset_id, part_no)
);

INSERT INTO parts_new (
    part_id,
    dataset_id,
    part_no,
    part_name,
    record_count,
    status
)
SELECT
    part_id,
    dataset_id,
    part_no,
    part_name,
    record_count,
    status
FROM parts;

DROP TABLE parts;

ALTER TABLE parts_new
RENAME TO parts;

CREATE INDEX idx_parts_dataset_status
ON parts(dataset_id, status);

CREATE INDEX idx_parts_dataset_part_no
ON parts(dataset_id, part_no);


-- ============================================================
-- 4. REBUILD DRAFT RECORDS
-- ============================================================

CREATE TABLE draft_records_new (
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

    pdf_id INTEGER NULL,
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

INSERT INTO draft_records_new (
    draft_record_id,
    part_id,
    sr_no,
    epic_no,
    name,
    relation_type,
    relative_name,
    house_number,
    age,
    gender,
    pdf_id,
    pdf_page,
    pdf_box,
    grid_row,
    grid_col,
    source_file_id
)
SELECT
    draft_record_id,
    part_id,
    sr_no,
    epic_no,
    name,
    relation_type,
    relative_name,
    house_number,
    age,
    gender,
    pdf_id,
    pdf_page,
    pdf_box,
    grid_row,
    grid_col,
    source_file_id
FROM draft_records;

DROP TABLE draft_records;

ALTER TABLE draft_records_new
RENAME TO draft_records;

CREATE INDEX idx_draft_part_serial
ON draft_records(part_id, sr_no, draft_record_id);

CREATE INDEX idx_draft_epic
ON draft_records(epic_no);

CREATE INDEX idx_draft_pdf
ON draft_records(pdf_id);


-- ============================================================
-- 5. REBUILD ASDD RECORDS
-- ============================================================

CREATE TABLE asdd_records_new (
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

    pdf_id INTEGER NULL,
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

INSERT INTO asdd_records_new (
    asdd_record_id,
    part_id,
    serial_no,
    epic_no,
    name,
    relative_details_raw,
    relative_name,
    relation_type,
    age,
    reference_epic,
    uncollectable_reason_raw,
    uncollectable_reason_code,
    pdf_id,
    pdf_page,
    pdf_box,
    source_file_id
)
SELECT
    asdd_record_id,
    part_id,
    serial_no,
    epic_no,
    name,
    relative_details_raw,
    relative_name,
    relation_type,
    age,
    reference_epic,
    uncollectable_reason_raw,
    uncollectable_reason_code,
    pdf_id,
    pdf_page,
    pdf_box,
    source_file_id
FROM asdd_records;

DROP TABLE asdd_records;

ALTER TABLE asdd_records_new
RENAME TO asdd_records;

CREATE INDEX idx_asdd_part_serial
ON asdd_records(part_id, serial_no, asdd_record_id);

CREATE INDEX idx_asdd_epic
ON asdd_records(epic_no);

CREATE INDEX idx_asdd_pdf
ON asdd_records(pdf_id);


-- ============================================================
-- 6. REBUILD DISCREPANCY RECORDS
-- ============================================================

CREATE TABLE discrepancy_records_new (
    discrepancy_record_id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id INTEGER NOT NULL,

    part_serial_number INTEGER NOT NULL,
    epic_no TEXT NOT NULL,
    name TEXT NOT NULL,

    age INTEGER NULL,
    gender TEXT NULL,

    reason_raw TEXT NOT NULL,

    pdf_id INTEGER NULL,
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

INSERT INTO discrepancy_records_new (
    discrepancy_record_id,
    part_id,
    part_serial_number,
    epic_no,
    name,
    age,
    gender,
    reason_raw,
    pdf_id,
    pdf_page,
    pdf_box,
    source_file_id
)
SELECT
    discrepancy_record_id,
    part_id,
    part_serial_number,
    epic_no,
    name,
    age,
    gender,
    reason_raw,
    pdf_id,
    pdf_page,
    pdf_box,
    source_file_id
FROM discrepancy_records;

DROP TABLE discrepancy_records;

ALTER TABLE discrepancy_records_new
RENAME TO discrepancy_records;

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


-- ============================================================
-- 7. RECREATE DISCREPANCY JUNCTION TABLE
-- ============================================================

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


-- ============================================================
-- 8. REBUILD EXTERNAL-CONTENT FTS INDEXES
-- ============================================================

INSERT INTO draft_records_fts(draft_records_fts)
VALUES ('rebuild');

INSERT INTO asdd_records_fts(asdd_records_fts)
VALUES ('rebuild');

INSERT INTO discrepancy_records_fts(discrepancy_records_fts)
VALUES ('rebuild');


-- ============================================================
-- 9. RECREATE FTS TRIGGERS
-- ============================================================

-- ------------------------------------------------------------
-- Draft
-- ------------------------------------------------------------

CREATE TRIGGER draft_records_ai
AFTER INSERT ON draft_records
BEGIN
    INSERT INTO draft_records_fts (
        rowid,
        name,
        relative_name
    )
    VALUES (
        new.draft_record_id,
        new.name,
        new.relative_name
    );
END;

CREATE TRIGGER draft_records_ad
AFTER DELETE ON draft_records
BEGIN
    INSERT INTO draft_records_fts (
        draft_records_fts,
        rowid,
        name,
        relative_name
    )
    VALUES (
        'delete',
        old.draft_record_id,
        old.name,
        old.relative_name
    );
END;

CREATE TRIGGER draft_records_au
AFTER UPDATE ON draft_records
BEGIN
    INSERT INTO draft_records_fts (
        draft_records_fts,
        rowid,
        name,
        relative_name
    )
    VALUES (
        'delete',
        old.draft_record_id,
        old.name,
        old.relative_name
    );

    INSERT INTO draft_records_fts (
        rowid,
        name,
        relative_name
    )
    VALUES (
        new.draft_record_id,
        new.name,
        new.relative_name
    );
END;


-- ------------------------------------------------------------
-- ASDD
-- ------------------------------------------------------------

CREATE TRIGGER asdd_records_ai
AFTER INSERT ON asdd_records
BEGIN
    INSERT INTO asdd_records_fts (
        rowid,
        name,
        relative_name
    )
    VALUES (
        new.asdd_record_id,
        new.name,
        new.relative_name
    );
END;

CREATE TRIGGER asdd_records_ad
AFTER DELETE ON asdd_records
BEGIN
    INSERT INTO asdd_records_fts (
        asdd_records_fts,
        rowid,
        name,
        relative_name
    )
    VALUES (
        'delete',
        old.asdd_record_id,
        old.name,
        old.relative_name
    );
END;

CREATE TRIGGER asdd_records_au
AFTER UPDATE ON asdd_records
BEGIN
    INSERT INTO asdd_records_fts (
        asdd_records_fts,
        rowid,
        name,
        relative_name
    )
    VALUES (
        'delete',
        old.asdd_record_id,
        old.name,
        old.relative_name
    );

    INSERT INTO asdd_records_fts (
        rowid,
        name,
        relative_name
    )
    VALUES (
        new.asdd_record_id,
        new.name,
        new.relative_name
    );
END;


-- ------------------------------------------------------------
-- Discrepancy
-- ------------------------------------------------------------

CREATE TRIGGER discrepancy_records_ai
AFTER INSERT ON discrepancy_records
BEGIN
    INSERT INTO discrepancy_records_fts (
        rowid,
        name
    )
    VALUES (
        new.discrepancy_record_id,
        new.name
    );
END;

CREATE TRIGGER discrepancy_records_ad
AFTER DELETE ON discrepancy_records
BEGIN
    INSERT INTO discrepancy_records_fts (
        discrepancy_records_fts,
        rowid,
        name
    )
    VALUES (
        'delete',
        old.discrepancy_record_id,
        old.name
    );
END;

CREATE TRIGGER discrepancy_records_au
AFTER UPDATE ON discrepancy_records
BEGIN
    INSERT INTO discrepancy_records_fts (
        discrepancy_records_fts,
        rowid,
        name
    )
    VALUES (
        'delete',
        old.discrepancy_record_id,
        old.name
    );

    INSERT INTO discrepancy_records_fts (
        rowid,
        name
    )
    VALUES (
        new.discrepancy_record_id,
        new.name
    );
END;