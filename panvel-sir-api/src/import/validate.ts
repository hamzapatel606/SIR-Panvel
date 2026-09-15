import type {
	ImportError,
	ImportValidationResult,
	NormalizedAsddRecord,
	NormalizedDiscrepancyRecord,
	NormalizedDraftRecord,
} from "./types";

function addError(
	errors: ImportError[],
	sourceRow: number,
	code: string,
	message: string,
): void {
	errors.push({
		sourceRow,
		code,
		message,
	});
}

function validateUniqueEpics(
	records: Array<{
		sourceRow: number;
		epicNo: string;
	}>,
	errors: ImportError[],
): void {
	const seen = new Map<string, number>();

	for (const record of records) {
		const epic = record.epicNo.trim().toUpperCase();

		const previousRow = seen.get(epic);

		if (previousRow !== undefined) {
			addError(
				errors,
				record.sourceRow,
				"DUPLICATE_EPIC",
				`Duplicate EPIC "${record.epicNo}" already exists at source row ${previousRow}`,
			);
		} else {
			seen.set(epic, record.sourceRow);
		}
	}
}

function validatePositiveInteger(
	value: number,
	field: string,
	sourceRow: number,
	errors: ImportError[],
): void {
	if (value < 1) {
		addError(
			errors,
			sourceRow,
			"INVALID_NUMBER",
			`${field} must be greater than or equal to 1`,
		);
	}
}

function validatePdfPage(
	pdfPage: number,
	sourceRow: number,
	errors: ImportError[],
): void {
	if (pdfPage < 1) {
		addError(
			errors,
			sourceRow,
			"INVALID_PDF_PAGE",
			"PDF Page must be greater than or equal to 1",
		);
	}
}

export function validateDraftRecords(
	records: NormalizedDraftRecord[],
): ImportValidationResult {
	const errors: ImportError[] = [];
	const warnings: ImportValidationResult["warnings"] = [];

	validateUniqueEpics(records, errors);

	for (const record of records) {
		validatePositiveInteger(
			record.srNo,
			"Sr No",
			record.sourceRow,
			errors,
		);

		validatePdfPage(
			record.pdfPage,
			record.sourceRow,
			errors,
		);

		if (record.age !== null && record.age < 0) {
			addError(
				errors,
				record.sourceRow,
				"INVALID_AGE",
				"Age cannot be negative",
			);
		}
	}

	return {
		valid: errors.length === 0,
		warnings,
		errors,
	};
}

export function validateAsddRecords(
	records: NormalizedAsddRecord[],
): ImportValidationResult {
	const errors: ImportError[] = [];
	const warnings: ImportValidationResult["warnings"] = [];

	validateUniqueEpics(records, errors);

	for (const record of records) {
		validatePositiveInteger(
			record.serialNo,
			"Serial No",
			record.sourceRow,
			errors,
		);

		validatePdfPage(
			record.pdfPage,
			record.sourceRow,
			errors,
		);

		if (record.age !== null && record.age < 0) {
			addError(
				errors,
				record.sourceRow,
				"INVALID_AGE",
				"Age cannot be negative",
			);
		}

		if (
			record.uncollectableReasonCode === "UNKNOWN"
		) {
			warnings.push({
				sourceRow: record.sourceRow,
				code: "UNKNOWN_REASON",
				message: `Unknown ASDD reason: ${record.uncollectableReasonRaw}`,
			});
		}
	}

	return {
		valid: errors.length === 0,
		warnings,
		errors,
	};
}

export function validateDiscrepancyRecords(
	records: NormalizedDiscrepancyRecord[],
): ImportValidationResult {
	const errors: ImportError[] = [];
	const warnings: ImportValidationResult["warnings"] = [];

	validateUniqueEpics(records, errors);

	for (const record of records) {
		validatePositiveInteger(
			record.partSerialNumber,
			"Part Serial Number",
			record.sourceRow,
			errors,
		);

		validatePdfPage(
			record.pdfPage,
			record.sourceRow,
			errors,
		);

		if (record.age !== null && record.age < 0) {
			addError(
				errors,
				record.sourceRow,
				"INVALID_AGE",
				"Age cannot be negative",
			);
		}

		if (record.reasonCodes.includes("UNKNOWN")) {
			warnings.push({
				sourceRow: record.sourceRow,
				code: "UNKNOWN_REASON",
				message: `Unknown discrepancy reason: ${record.reasonRaw}`,
			});
		}
	}

	return {
		valid: errors.length === 0,
		warnings,
		errors,
	};
}