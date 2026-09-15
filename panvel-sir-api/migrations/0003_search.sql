-- ============================================================
-- SIR Panvel API
-- Migration 0003: Full-Text Search
-- ============================================================


-- ------------------------------------------------------------
-- DRAFT SEARCH
-- ------------------------------------------------------------

CREATE VIRTUAL TABLE draft_records_fts USING fts5(
    name,
    relative_name,
    content='draft_records',
    content_rowid='draft_record_id'
);


-- ------------------------------------------------------------
-- ASDD SEARCH
-- ------------------------------------------------------------

CREATE VIRTUAL TABLE asdd_records_fts USING fts5(
    name,
    relative_name,
    content='asdd_records',
    content_rowid='asdd_record_id'
);


-- ------------------------------------------------------------
-- DISCREPANCY SEARCH
-- ------------------------------------------------------------

CREATE VIRTUAL TABLE discrepancy_records_fts USING fts5(
    name,
    content='discrepancy_records',
    content_rowid='discrepancy_record_id'
);