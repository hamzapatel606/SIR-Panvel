-- ============================================================
-- SIR Panvel API
-- Migration 0006: Search Indexes and Extended FTS Fields
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_draft_epic_nocase
ON draft_records(epic_no COLLATE NOCASE);

CREATE INDEX IF NOT EXISTS idx_draft_relation_nocase
ON draft_records(relation_type COLLATE NOCASE);

CREATE INDEX IF NOT EXISTS idx_draft_house_nocase
ON draft_records(house_number COLLATE NOCASE);

CREATE INDEX IF NOT EXISTS idx_draft_age
ON draft_records(age);

CREATE INDEX IF NOT EXISTS idx_draft_gender_nocase
ON draft_records(gender COLLATE NOCASE);

CREATE INDEX IF NOT EXISTS idx_asdd_epic_nocase
ON asdd_records(epic_no COLLATE NOCASE);

CREATE INDEX IF NOT EXISTS idx_asdd_relation_nocase
ON asdd_records(relation_type COLLATE NOCASE);

CREATE INDEX IF NOT EXISTS idx_asdd_age
ON asdd_records(age);

CREATE INDEX IF NOT EXISTS idx_asdd_reference_epic_nocase
ON asdd_records(reference_epic COLLATE NOCASE);

CREATE INDEX IF NOT EXISTS idx_asdd_reason_nocase
ON asdd_records(uncollectable_reason_raw COLLATE NOCASE);

CREATE INDEX IF NOT EXISTS idx_discrepancy_epic_nocase
ON discrepancy_records(epic_no COLLATE NOCASE);

CREATE INDEX IF NOT EXISTS idx_discrepancy_age
ON discrepancy_records(age);

CREATE INDEX IF NOT EXISTS idx_discrepancy_gender_nocase
ON discrepancy_records(gender COLLATE NOCASE);

CREATE INDEX IF NOT EXISTS idx_discrepancy_reason_nocase
ON discrepancy_records(reason_raw COLLATE NOCASE);

-- Rebuild ASDD FTS so reason can be searched in addition to names.
DROP TRIGGER IF EXISTS asdd_records_ai;
DROP TRIGGER IF EXISTS asdd_records_ad;
DROP TRIGGER IF EXISTS asdd_records_au;
DROP TABLE IF EXISTS asdd_records_fts;

CREATE VIRTUAL TABLE asdd_records_fts USING fts5(
    name,
    relative_name,
    reason,
    content='asdd_records',
    content_rowid='asdd_record_id'
);

INSERT INTO asdd_records_fts(rowid, name, relative_name, reason)
SELECT asdd_record_id, name, relative_name, uncollectable_reason_raw
FROM asdd_records;

CREATE TRIGGER asdd_records_ai
AFTER INSERT ON asdd_records
BEGIN
    INSERT INTO asdd_records_fts(rowid, name, relative_name, reason)
    VALUES (new.asdd_record_id, new.name, new.relative_name, new.uncollectable_reason_raw);
END;

CREATE TRIGGER asdd_records_ad
AFTER DELETE ON asdd_records
BEGIN
    INSERT INTO asdd_records_fts(asdd_records_fts, rowid, name, relative_name, reason)
    VALUES ('delete', old.asdd_record_id, old.name, old.relative_name, old.uncollectable_reason_raw);
END;

CREATE TRIGGER asdd_records_au
AFTER UPDATE ON asdd_records
BEGIN
    INSERT INTO asdd_records_fts(asdd_records_fts, rowid, name, relative_name, reason)
    VALUES ('delete', old.asdd_record_id, old.name, old.relative_name, old.uncollectable_reason_raw);
    INSERT INTO asdd_records_fts(rowid, name, relative_name, reason)
    VALUES (new.asdd_record_id, new.name, new.relative_name, new.uncollectable_reason_raw);
END;

-- Rebuild Discrepancy FTS so reason can be searched in addition to name.
DROP TRIGGER IF EXISTS discrepancy_records_ai;
DROP TRIGGER IF EXISTS discrepancy_records_ad;
DROP TRIGGER IF EXISTS discrepancy_records_au;
DROP TABLE IF EXISTS discrepancy_records_fts;

CREATE VIRTUAL TABLE discrepancy_records_fts USING fts5(
    name,
    reason,
    content='discrepancy_records',
    content_rowid='discrepancy_record_id'
);

INSERT INTO discrepancy_records_fts(rowid, name, reason)
SELECT discrepancy_record_id, name, reason_raw
FROM discrepancy_records;

CREATE TRIGGER discrepancy_records_ai
AFTER INSERT ON discrepancy_records
BEGIN
    INSERT INTO discrepancy_records_fts(rowid, name, reason)
    VALUES (new.discrepancy_record_id, new.name, new.reason_raw);
END;

CREATE TRIGGER discrepancy_records_ad
AFTER DELETE ON discrepancy_records
BEGIN
    INSERT INTO discrepancy_records_fts(discrepancy_records_fts, rowid, name, reason)
    VALUES ('delete', old.discrepancy_record_id, old.name, old.reason_raw);
END;

CREATE TRIGGER discrepancy_records_au
AFTER UPDATE ON discrepancy_records
BEGIN
    INSERT INTO discrepancy_records_fts(discrepancy_records_fts, rowid, name, reason)
    VALUES ('delete', old.discrepancy_record_id, old.name, old.reason_raw);
    INSERT INTO discrepancy_records_fts(rowid, name, reason)
    VALUES (new.discrepancy_record_id, new.name, new.reason_raw);
END;
