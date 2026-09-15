-- Draft FTS synchronization

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


-- ASDD FTS synchronization

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


-- Discrepancy FTS synchronization

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