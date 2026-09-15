# Importer update notes

This build is based on `panvel-sir-api`.

## Import validation
- Empty nullable fields are accepted and normalized to SQL NULL.
- Empty nullable fields generate `OPTIONAL_FIELD_EMPTY` warnings.
- Empty required fields generate `REQUIRED_FIELD_MISSING` errors and reject the complete import.
- Invalid non-empty integers reject the import.
- Duplicate EPICs within an uploaded workbook reject the import.

## Safety
- The importer verifies that the target dataset exists and is ACTIVE before writing records.
- Existing EPIC checks are performed in parameter-safe chunks rather than one database query per EPIC.
- Failed Part imports are marked ERROR and can be cleaned up without destroying an independently existing PDF-only Part.

## Important
This is a safer importer foundation, but very large multi-hundred-thousand-record production imports should still be executed as bounded Part/import jobs rather than a single enormous HTTP request.
