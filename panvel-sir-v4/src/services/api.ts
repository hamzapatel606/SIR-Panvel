const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

export type Section = "asdd" | "draft" | "discrepancy";

export interface DatasetVersion {
	dataset_id: number;
	version_code: string;
	version_name: string;
	status?: "ACTIVE" | "ARCHIVED";
	created_at?: string;
}

export interface Part {
	part_id: number;
	part_no: number;
	part_name: string | null;
	record_count: number;
	status: "READY";
}

export interface SearchResponse<T = unknown> {
	section: Section;
	version: DatasetVersion;
	part: Part | null;
	records: T[];
	nextCursor: string | null;
	hasMore: boolean;
}

async function request<T>(path: string, token?: string): Promise<T> {
	const headers: HeadersInit = {};

	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	const response = await fetch(`${API_BASE_URL}${path}`, { headers });

	if (!response.ok) {
		let message = `Request failed (${response.status})`;

		try {
			const body = await response.json();
			if (body?.message) {
				message = body.message;
			}
		} catch {
			// Keep default error message.
		}

		throw new Error(message);
	}

	return response.json();
}

export function getVersion(section: Section, token?: string) {
	return request<{
		section: Section;
		version: DatasetVersion;
	}>(`/api/${section}/version`, token);
}

export interface AdminDataset extends DatasetVersion {
	dataset_id: number;
	status: "ACTIVE" | "ARCHIVED";
}

export function getAdminDatasets(section: Section, token: string) {
	return request<{
		section: Section;
		datasets: AdminDataset[];
	}>(`/api/admin/${section}/datasets`, token);
}

export function createAdminDataset(
	section: Section,
	token: string,
	versionCode: string,
	versionName: string,
) {
	return fetch(`${API_BASE_URL}/api/admin/${section}/datasets`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ versionCode, versionName }),
	}).then(async (response) => {
		if (!response.ok) {
			let message = `Request failed (${response.status})`;
			try {
				const body = await response.json();
				if (body?.message) message = body.message;
			} catch {
				// Keep default error message.
			}
			throw new Error(message);
		}
		return response.json() as Promise<{
			success: true;
			dataset: AdminDataset;
		}>;
	});
}

export function activateAdminDataset(
	section: Section,
	token: string,
	datasetId: number,
) {
	return fetch(
		`${API_BASE_URL}/api/admin/${section}/datasets/${datasetId}/activate`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		},
	).then(async (response) => {
		if (!response.ok) {
			let message = `Request failed (${response.status})`;
			try {
				const body = await response.json();
				if (body?.message) message = body.message;
			} catch {
				// Keep default error message.
			}
			throw new Error(message);
		}
		return response.json() as Promise<{
			success: true;
			section: Section;
			datasetId: number;
			status: "ACTIVE";
		}>;
	});
}

export function getParts(section: Section) {
	return request<{
		section: Section;
		version: DatasetVersion;
		parts: Part[];
	}>(`/api/${section}/parts`);
}

export function searchRecords(
	section: Section,
	query: string,
	field = "all",
	partNo?: number,
	cursor?: string,
	limit = 30,
) {
	const params = new URLSearchParams();

	if (query.trim()) {
		params.set("query", query.trim());
	}

	params.set("field", field);

	if (partNo !== undefined) {
		params.set("partNo", String(partNo));
	}

	if (cursor) {
		params.set("cursor", cursor);
	}

	params.set("limit", String(limit));

	return request<SearchResponse>(
		`/api/${section}/search?${params.toString()}`,
	);
}

export function getRecordByEpic(
	section: Section,
	epicNo: string,
) {
	return request<{
		section: Section;
		version: DatasetVersion;
		record: unknown;
	}>(`/api/${section}/by-epic/${encodeURIComponent(epicNo)}`);
}
export interface ImportResult {
	partsProcessed?: number;
	recordCount?: number;
	totalRecords?: number;
	parts?: unknown[];
	[key: string]: unknown;
}

export interface PdfImportResult {
	section: Section;
	datasetId: number;
	partId: number;
	partNo: number;
	pdfId: number;
	partStatus: "NO_DATA" | "PREPARING" | "READY" | "ERROR";
	replacedPdfId?: number | null;
}

export async function importAdminPdfs(
	section: Section,
	token: string,
	datasetId: number,
	files: Array<{ file: File; partNo: number; pageCount?: number | null }>,
) {
	const formData = new FormData();
	formData.set("section", section);
	formData.set("datasetId", String(datasetId));

	for (const item of files) {
		formData.append("file", item.file);
		formData.append("partNo", String(item.partNo));
		formData.append("pageCount", item.pageCount == null ? "" : String(item.pageCount));
	}

	const response = await fetch(`${API_BASE_URL}/api/admin/import/pdfs`, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}` },
		body: formData,
	});

	let body: any = null;
	try {
		body = await response.json();
	} catch {
		// Keep generic error below.
	}

	if (!response.ok) {
		throw new Error(body?.message ?? body?.error ?? `PDF import failed (${response.status})`);
	}

	return body as {
		success: true;
		count: number;
		results: PdfImportResult[];
	};
}

export async function importAdminWorkbook(
	section: Section,
	token: string,
	datasetId: number,
	file: File,
) {
	const formData = new FormData();
	formData.set("section", section);
	formData.set("datasetId", String(datasetId));
	formData.set("file", file);

	const response = await fetch(`${API_BASE_URL}/api/admin/import/data`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
		},
		body: formData,
	});

	let body: any = null;
	try {
		body = await response.json();
	} catch {
		// Keep the generic error below.
	}

	if (!response.ok) {
		if (body?.error === "IMPORT_VALIDATION_FAILED") {
			const details = Array.isArray(body.errors) ? body.errors : [];
			const first = details[0]?.message ?? body.message ?? "XLSX validation failed.";
			throw new Error(`${first}${body.errorCount ? ` (${body.errorCount} validation error(s))` : ""}`);
		}
		throw new Error(body?.message ?? `Import failed (${response.status})`);
	}

	return body?.result as ImportResult;
}
