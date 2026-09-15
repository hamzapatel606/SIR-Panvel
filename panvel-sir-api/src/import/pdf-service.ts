import { createPdfDocument, createSourceFile, ensurePartForPdf, getCurrentPdf, getDatabase } from "./db";
import type { ImportSection } from "./types";

export interface AttachPdfInput {
	section: ImportSection; datasetId: number; partNo: number; partName: string | null;
	sourceFile: { fileName: string; fileType: string; fileSize?: number | null; checksum?: string | null };
	pdf: { r2Key: string; fileName: string; fileSize: number; pageCount: number | null; checksum?: string | null };
}
export interface AttachPdfResult { section: ImportSection; datasetId: number; partId: number; partNo: number; pdfId: number; partStatus: "NO_DATA"|"PREPARING"|"READY"|"ERROR"; replacedPdfId?: number | null; }

export async function attachPdf(env: Env, input: AttachPdfInput): Promise<AttachPdfResult> {
	const db = getDatabase(env, input.section);
	const part = await ensurePartForPdf(db, input.datasetId, input.partNo, input.partName);
	const oldPdf = await getCurrentPdf(db, part.partId);
	const sourceFile = await createSourceFile(db, input.datasetId, part.partId, input.sourceFile.fileName, input.sourceFile.fileType, input.sourceFile.fileSize ?? null, input.sourceFile.checksum ?? null);
	const pdf = await createPdfDocument(db, part.partId, sourceFile.sourceFileId, input.pdf.r2Key, input.pdf.fileName, input.pdf.fileSize, input.pdf.pageCount, input.pdf.checksum ?? null);
	const recordTable = input.section === "draft" ? "draft_records" : input.section === "asdd" ? "asdd_records" : "discrepancy_records";
	await db.batch([
		db.prepare(`UPDATE ${recordTable} SET pdf_id = ? WHERE part_id = ?`).bind(pdf.pdfId, part.partId),
		...(oldPdf ? [db.prepare(`UPDATE pdf_documents SET status = 'ERROR' WHERE pdf_id = ? AND status = 'READY'`).bind(oldPdf.pdfId)] : []),
	]);
	if (oldPdf && oldPdf.r2Key !== input.pdf.r2Key) { try { await env.PDF_BUCKET.delete(oldPdf.r2Key); } catch {} }
	return { section: input.section, datasetId: part.datasetId, partId: part.partId, partNo: part.partNo, pdfId: pdf.pdfId, partStatus: part.status, replacedPdfId: oldPdf?.pdfId ?? null };
}

export async function uploadPdf(bucket: R2Bucket, key: string, file: ArrayBuffer, contentType = "application/pdf"): Promise<void> {
	if (!key.trim()) throw new Error("PDF R2 key cannot be empty.");
	if (file.byteLength === 0) throw new Error("PDF file cannot be empty.");
	await bucket.put(key, file, { httpMetadata: { contentType } });
}

export async function uploadAndAttachPdf(env: Env, input: AttachPdfInput, file: ArrayBuffer): Promise<AttachPdfResult> {
	await uploadPdf(env.PDF_BUCKET, input.pdf.r2Key, file);
	try { return await attachPdf(env, input); }
	catch (error) { try { await env.PDF_BUCKET.delete(input.pdf.r2Key); } catch {} throw error; }
}
