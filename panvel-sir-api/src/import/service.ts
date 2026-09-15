import {
	createSourceFile,
	getCurrentPdf,
	getDatabase,
	insertAsddRecords,
	insertDiscrepancyRecords,
	insertDraftRecords,
	markPartError,
	cleanupFailedPart,
	markPartReady,
	preparePart,
} from "./db";
import { processXlsx } from "./pipeline";
import type {
	ImportSection,
	NormalizedAsddRecord,
	NormalizedDiscrepancyRecord,
	NormalizedDraftRecord,
	ImportValidationResult,
} from "./types";

export interface ImportSourceInput {
	fileName: string;
	fileType: string;
	fileSize?: number | null;
	checksum?: string | null;
}
export interface ImportWorkbookInput {
	section: ImportSection;
	datasetId: number;
	xlsxBuffer: ArrayBuffer;
	sourceFile: ImportSourceInput;
}
export interface ImportPartResult {
	section: ImportSection;
	datasetId: number;
	partId: number;
	partNo: number;
	recordCount: number;
	status: "READY";
	warnings: number;
	pdfAttached: boolean;
}
export interface ImportWorkbookResult {
	section: ImportSection;
	datasetId: number;
	fileName: string;
	totalRecords: number;
	parts: ImportPartResult[];
	warnings: ImportValidationResult["warnings"];
}
export class ImportValidationError extends Error {
	constructor(public readonly validation: ImportValidationResult) {
		super("Import validation failed.");
		this.name = "ImportValidationError";
	}
}

export async function importWorkbook(env: Env, input: ImportWorkbookInput): Promise<ImportWorkbookResult> {
	const db = getDatabase(env, input.section);
	const pipelineResult = processXlsx(input.xlsxBuffer, input.section);
	if (!pipelineResult.validation.valid) throw new ImportValidationError(pipelineResult.validation);

	const dataset = await db.prepare(`SELECT dataset_id, status FROM dataset_versions WHERE dataset_id = ? LIMIT 1`)
		.bind(input.datasetId).first<{ dataset_id: number; status: "ACTIVE" | "ARCHIVED" }>();
	if (!dataset) {
		throw new Error(`Dataset ${input.datasetId} does not exist in the ${input.section} database.`);
	}

	// Both dataset states are supported, but they have different purposes:
	// ARCHIVED = prepare a future version privately; ACTIVE = append new
	// Parts to the currently published dataset. Existing READY Parts are
	// never overwritten by preparePart().
	if (dataset.status !== "ARCHIVED" && dataset.status !== "ACTIVE") {
		throw new Error(`Dataset ${input.datasetId} has an invalid status.`);
	}

	await validateExistingEpics(db, input.section, input.datasetId, pipelineResult.records);

	const sourceFile = await createSourceFile(db, input.datasetId, null, input.sourceFile.fileName, input.sourceFile.fileType, input.sourceFile.fileSize ?? null, input.sourceFile.checksum ?? null);
	const groups = new Map<number, (NormalizedDraftRecord | NormalizedAsddRecord | NormalizedDiscrepancyRecord)[]>();
	for (const record of pipelineResult.records) {
		const existing = groups.get(record.partNo);
		if (existing) existing.push(record); else groups.set(record.partNo, [record]);
	}

	const results: ImportPartResult[] = [];
	for (const partNo of [...groups.keys()].sort((a,b)=>a-b)) {
		const partRecords = groups.get(partNo)!;
		const warningCount = pipelineResult.validation.warnings.reduce((n,w) => n + (w.count ?? 1), 0);
		results.push(await importSinglePart(env, db, input, partNo, partRecords, warningCount, sourceFile.sourceFileId));
	}
	return {
		section: input.section,
		datasetId: input.datasetId,
		fileName: input.sourceFile.fileName,
		totalRecords: pipelineResult.records.length,
		parts: results,
		warnings: pipelineResult.validation.warnings,
	};
}

async function importSinglePart(
	env: Env, db: D1Database, input: ImportWorkbookInput, partNo: number,
	records: (NormalizedDraftRecord | NormalizedAsddRecord | NormalizedDiscrepancyRecord)[], warnings: number, sourceFileId: number,
): Promise<ImportPartResult> {
	let partId: number | null = null;
	try {
		const part = await preparePart(db, input.datasetId, partNo, null);
		partId = part.partId;
		const currentPdf = await getCurrentPdf(db, partId);
		const pdfId = currentPdf?.pdfId ?? null;

		switch (input.section) {
			case "draft": await insertDraftRecords(db, records as NormalizedDraftRecord[], partId, pdfId, sourceFileId); break;
			case "asdd": await insertAsddRecords(db, records as NormalizedAsddRecord[], partId, pdfId, sourceFileId); break;
			case "discrepancy": await insertDiscrepancyRecords(db, records as NormalizedDiscrepancyRecord[], partId, pdfId, sourceFileId); break;
		}
		const readyPart = await markPartReady(db, partId, records.length);
		return { section: input.section, datasetId: readyPart.datasetId, partId: readyPart.partId, partNo: readyPart.partNo, recordCount: readyPart.recordCount, status: "READY", warnings, pdfAttached: Boolean(pdfId) };
	} catch (error) {
		if (partId !== null) {
			try { await markPartError(db, partId); await cleanupFailedPart(db, input.section, partId); } catch {}
		}
		throw error;
	}
}

function getRecordTable(section: ImportSection): string {
	switch (section) { case "draft": return "draft_records"; case "asdd": return "asdd_records"; case "discrepancy": return "discrepancy_records"; }
}

async function validateExistingEpics(db: D1Database, section: ImportSection, datasetId: number, records: (NormalizedDraftRecord | NormalizedAsddRecord | NormalizedDiscrepancyRecord)[]): Promise<void> {
	if (!records.length) return;
	const table = getRecordTable(section);
	const hasExisting = await db.prepare(`SELECT 1 AS present FROM parts WHERE dataset_id = ? AND status = 'READY' LIMIT 1`).bind(datasetId).first<{present:number}>();
	if (!hasExisting) return;
	const epics = [...new Set(records.map(r => r.epicNo.trim()))];
	for (let start=0; start<epics.length; start+=90) {
		const chunk = epics.slice(start,start+90);
		const placeholders = chunk.map(()=>"?").join(",");
		const row = await db.prepare(`SELECT epic_no FROM ${table} WHERE part_id IN (SELECT part_id FROM parts WHERE dataset_id = ?) AND epic_no COLLATE NOCASE IN (${placeholders}) LIMIT 1`)
			.bind(datasetId,...chunk).first<{epic_no:string}>();
		if (row) throw new Error(`Duplicate EPIC "${row.epic_no}" already exists in dataset ${datasetId}.`);
	}
}
