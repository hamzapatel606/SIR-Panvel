-- SIR Panvel API
-- Migration 0007: importer integrity/performance support

CREATE INDEX IF NOT EXISTS idx_parts_dataset_status_part
ON parts(dataset_id, status, part_no);

CREATE INDEX IF NOT EXISTS idx_source_files_part
ON source_files(part_id, source_file_id);

CREATE INDEX IF NOT EXISTS idx_pdf_documents_part_status
ON pdf_documents(part_id, status, pdf_id);
