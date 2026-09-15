export type ImportSection = "asdd" | "draft" | "discrepancy";

export interface NormalizedDraftRecord {
	sourceRow: number;
	partNo: number;

	srNo: number;
	epicNo: string;
	name: string;

	relationType: string | null;
	relativeName: string | null;
	houseNumber: string | null;

	age: number | null;
	gender: string | null;

	pdfPage: number;
	pdfBox: string | null;
	gridRow: number | null;
	gridCol: number | null;
}

export interface NormalizedAsddRecord {
	sourceRow: number;
	partNo: number;

	serialNo: number;
	epicNo: string;
	name: string;

	relativeDetailsRaw: string | null;
	relativeName: string | null;
	relationType: string | null;

	age: number | null;
	referenceEpic: string | null;

	uncollectableReasonRaw: string;
	uncollectableReasonCode: string;

	pdfPage: number;
	pdfBox: string | null;
}

export interface NormalizedDiscrepancyRecord {
	sourceRow: number;
	partNo: number;

	partSerialNumber: number;
	epicNo: string;
	name: string;

	age: number | null;
	gender: string | null;

	reasonRaw: string;
	reasonCodes: string[];

	pdfPage: number;
	pdfBox: string | null;
}

export interface ImportWarning {
	sourceRow: number;
	code: string;
	message: string;
	count?: number;
}

export interface ImportError {
	sourceRow: number;
	code: string;
	message: string;
}

export interface ImportValidationResult {
	valid: boolean;
	warnings: ImportWarning[];
	errors: ImportError[];
}