import { parseXlsx } from "./xlsx";
import {
	normalizeAsddRows,
	normalizeDiscrepancyRows,
	normalizeDraftRows,
} from "./normalize";
import {
	validateAsddRecords,
	validateDiscrepancyRecords,
	validateDraftRecords,
} from "./validate";

function aggregateWarnings(warnings: ImportValidationResult["warnings"]): ImportValidationResult["warnings"] {
	const map = new Map<string, ImportValidationResult["warnings"][number]>();
	for (const warning of warnings) {
		const key = `${warning.code}|${warning.message}`;
		const existing = map.get(key);
		if (existing) {
			existing.count = (existing.count ?? 1) + 1;
		} else {
			map.set(key, { ...warning, count: 1 });
		}
	}
	return [...map.values()];
}

import type {
	ImportSection,
	ImportValidationResult,
	NormalizedAsddRecord,
	NormalizedDiscrepancyRecord,
	NormalizedDraftRecord,
} from "./types";

export interface ImportPipelineResult {
	section: ImportSection;
	sheetName: string;
	rowCount: number;
	records:
		| NormalizedDraftRecord[]
		| NormalizedAsddRecord[]
		| NormalizedDiscrepancyRecord[];
	validation: ImportValidationResult;
}

export function processXlsx(
	buffer: ArrayBuffer,
	section: ImportSection,
): ImportPipelineResult {
	const workbook = parseXlsx(buffer);

	switch (section) {
		case "draft": {
			const normalized = normalizeDraftRows(workbook.rows);

			const validation = validateDraftRecords(
				normalized.records,
			);

			return {
				section,
				sheetName: workbook.sheetName,
				rowCount: workbook.rows.length,
				records: normalized.records,
				validation: {
					valid:
						normalized.result.valid &&
						validation.valid,
					warnings: aggregateWarnings([
						...normalized.result.warnings,
						...validation.warnings,
					]),
					errors: [
						...normalized.result.errors,
						...validation.errors,
					],
				},
			};
		}

		case "asdd": {
			const normalized = normalizeAsddRows(workbook.rows);

			const validation = validateAsddRecords(
				normalized.records,
			);

			return {
				section,
				sheetName: workbook.sheetName,
				rowCount: workbook.rows.length,
				records: normalized.records,
				validation: {
					valid:
						normalized.result.valid &&
						validation.valid,
					warnings: aggregateWarnings([
						...normalized.result.warnings,
						...validation.warnings,
					]),
					errors: [
						...normalized.result.errors,
						...validation.errors,
					],
				},
			};
		}

		case "discrepancy": {
			const normalized =
				normalizeDiscrepancyRows(workbook.rows);

			const validation = validateDiscrepancyRecords(
				normalized.records,
			);

			return {
				section,
				sheetName: workbook.sheetName,
				rowCount: workbook.rows.length,
				records: normalized.records,
				validation: {
					valid:
						normalized.result.valid &&
						validation.valid,
					warnings: aggregateWarnings([
						...normalized.result.warnings,
						...validation.warnings,
					]),
					errors: [
						...normalized.result.errors,
						...validation.errors,
					],
				},
			};
		}
	}
}