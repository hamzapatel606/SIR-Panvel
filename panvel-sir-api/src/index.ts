import { importWorkbook } from "./import/service";
import { uploadAndAttachPdf } from "./import/pdf-service";
import { ImportValidationError } from "./import/service";
import { getR2Usage } from "./admin-usage";
const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
};
function json(
	data: unknown,
	init?: ResponseInit,
): Response {
	const response = Response.json(data, init);

	for (const [key, value] of Object.entries(CORS_HEADERS)) {
		response.headers.set(key, value);
	}

	return response;
}
type Section = "asdd" | "draft" | "discrepancy";

function getDatabase(env: Env, section: Section): D1Database {
	switch (section) {
		case "asdd":
			return env.ASDD_DB;

		case "draft":
			return env.DRAFT_DB;

		case "discrepancy":
			return env.DISCREPANCY_DB;
	}
}

function encodeCursor(serial: number, id: number): string {
	return btoa(JSON.stringify({ serial, id }));
}

function decodeCursor(
	cursor: string,
): { serial: number; id: number } | null {
	try {
		const decoded = JSON.parse(atob(cursor));

		if (
			typeof decoded.serial !== "number" ||
			typeof decoded.id !== "number"
		) {
			return null;
		}

		return decoded;
	} catch {
		return null;
	}
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: CORS_HEADERS,
			});
		}
		const url = new URL(request.url);

		const isAdminRoute =
			url.pathname.startsWith("/api/admin/");

		if (isAdminRoute) {
			const token = request.headers.get("Authorization");

			if (!env.ADMIN_TOKEN) {
				return json(
					{
						error: "ADMIN_NOT_CONFIGURED",
						message: "Admin authentication is not configured.",
					},
					{ status: 500 },
				);
			}

			if (token !== `Bearer ${env.ADMIN_TOKEN}`) {
				return json(
					{
						error: "UNAUTHORIZED",
						message: "Invalid admin token.",
					},
					{ status: 401 },
				);
			}
		}

		// --------------------------------------------------------
		// Admin / XLSX Import
		// --------------------------------------------------------

		if (
			request.method === "POST" &&
			url.pathname === "/api/admin/import/data"
		) {
			try {
				const formData = await request.formData();

				const sectionValue =
					formData.get("section");

				const datasetIdValue =
					formData.get("datasetId");

				const file =
					formData.get("file");

				if (
					sectionValue !== "asdd" &&
					sectionValue !== "draft" &&
					sectionValue !== "discrepancy"
				) {
					return json(
						{
							error: "INVALID_SECTION",
							message:
								"Section must be asdd, draft, or discrepancy.",
						},
						{ status: 400 },
					);
				}

				const datasetId =
					Number(datasetIdValue);

				if (!(file instanceof File)) {
					return json(
						{
							error: "FILE_REQUIRED",
							message:
								"An XLSX file is required.",
						},
						{ status: 400 },
					);
				}

				const xlsxBuffer =
					await file.arrayBuffer();

				const result = await importWorkbook(
					env,
					{
						section: sectionValue,
						datasetId,
						xlsxBuffer,
						sourceFile: {
							fileName: file.name,
							fileType:
								file.type ||
								"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
							fileSize: file.size,
						},
					},
				);

				return json(
					{
						success: true,
						result,
					},
					{ status: 201 },
				);
			} catch (error) {
				if (error instanceof ImportValidationError) {
					return json({
						error: "IMPORT_VALIDATION_FAILED",
						message: "No database writes were made because validation failed.",
						errors: error.validation.errors.slice(0, 200),
						errorCount: error.validation.errors.length,
						warnings: error.validation.warnings,
					}, { status: 422 });
				}
				return json({ error: "IMPORT_FAILED", message: error instanceof Error ? error.message : "Unable to import XLSX data." }, { status: 400 });
			}
		}

		// --------------------------------------------------------
		// Admin / Usage
		// --------------------------------------------------------
		if (request.method === "GET" && url.pathname === "/api/admin/usage") {
			try { return json(await getR2Usage(env)); }
			catch (error) { return json({ error: "USAGE_UNAVAILABLE", message: error instanceof Error ? error.message : "Cloudflare usage unavailable." }, { status: 503 }); }
		}

		// --------------------------------------------------------
		// Admin / Multiple PDF Upload
		// --------------------------------------------------------
		if (request.method === "POST" && url.pathname === "/api/admin/import/pdfs") {
			try {
				const formData = await request.formData();
				const sectionValue = formData.get("section");
				const datasetId = Number(formData.get("datasetId"));
				if (sectionValue !== "asdd" && sectionValue !== "draft" && sectionValue !== "discrepancy") return json({ error: "INVALID_SECTION" }, { status: 400 });
				if (!Number.isInteger(datasetId) || datasetId < 1) return json({ error: "INVALID_DATASET_ID" }, { status: 400 });
				const files = formData.getAll("file").filter((v): v is File => v instanceof File);
				if (!files.length) return json({ error: "FILE_REQUIRED", message: "At least one PDF file is required." }, { status: 400 });
				if (files.length > 20) return json({ error: "TOO_MANY_FILES", message: "Maximum 20 PDFs per request." }, { status: 400 });
				const partNos = formData.getAll("partNo").map(v => Number(v));
				const pageCountsRaw = formData.getAll("pageCount");
				if (partNos.length && partNos.length !== files.length) return json({ error: "PART_COUNT_MISMATCH", message: "Provide one partNo per file, or omit partNo fields and use Part_N.pdf filenames." }, { status: 400 });
				if (pageCountsRaw.length && pageCountsRaw.length !== files.length) return json({ error: "PAGE_COUNT_MISMATCH", message: "Provide one pageCount per file, or leave each pageCount blank." }, { status: 400 });
				const pageCounts = files.map((_, i) => {
					const raw = pageCountsRaw.length ? String(pageCountsRaw[i] ?? "").trim() : "";
					if (!raw) return null;
					const value = Number(raw);
					return Number.isInteger(value) && value >= 1 ? value : NaN;
				});
				if (pageCounts.some(value => Number.isNaN(value))) return json({ error: "INVALID_PAGE_COUNT", message: "Page Count must be a positive integer when supplied. Leave it blank if unknown." }, { status: 400 });
				const resolved = files.map((file, i) => {
					const supplied = partNos.length ? partNos[i] : null;
					const match = file.name.match(/(?:^|[^0-9])part[_ -]?(\d+)(?:[^0-9]|$)/i);
					const partNo = supplied ?? (match ? Number(match[1]) : NaN);
					return { file, partNo, pageCount: pageCounts[i] };
				});
				if (resolved.some(x => !Number.isInteger(x.partNo) || x.partNo < 1)) return json({ error: "PART_NO_REQUIRED", message: "Each PDF needs a valid partNo or a filename containing Part_123." }, { status: 400 });
				const buffers = await Promise.all(resolved.map(x => x.file.arrayBuffer()));
				const results = [];
				for (let i=0;i<resolved.length;i++) {
					const {file,partNo,pageCount}=resolved[i]; const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
					results.push(await uploadAndAttachPdf(env,{section:sectionValue,datasetId,partNo,partName:null,sourceFile:{fileName:file.name,fileType:file.type||"application/pdf",fileSize:file.size},pdf:{r2Key:`pdf/${sectionValue}/dataset-${datasetId}/part-${partNo}/pdf-${crypto.randomUUID()}-${safe}`,fileName:file.name,fileSize:file.size,pageCount}},buffers[i]));
				}
				return json({ success:true, count:results.length, results }, { status:201 });
			} catch (error) { return json({ error:"PDF_IMPORT_FAILED", message:error instanceof Error?error.message:"Unable to upload PDFs." }, { status:400 }); }
		}

		// --------------------------------------------------------
		// Admin / PDF Upload
		// --------------------------------------------------------

		if (
			request.method === "POST" &&
			url.pathname === "/api/admin/import/pdf"
		) {
			try {
				const formData = await request.formData();

				const sectionValue =
					formData.get("section");

				const datasetIdValue =
					formData.get("datasetId");

				const partNoValue =
					formData.get("partNo");

				const partNameValue =
					formData.get("partName");

				const pageCountValue =
					formData.get("pageCount");

				const file =
					formData.get("file");

				if (
					sectionValue !== "asdd" &&
					sectionValue !== "draft" &&
					sectionValue !== "discrepancy"
				) {
					return json(
						{
							error: "INVALID_SECTION",
							message:
								"Section must be asdd, draft, or discrepancy.",
						},
						{ status: 400 },
					);
				}

				const datasetId =
					Number(datasetIdValue);

				const partNo =
					Number(partNoValue);

				const pageCount =
					pageCountValue === null || String(pageCountValue).trim() === ""
						? null
						: Number(pageCountValue);

				if (
					!Number.isInteger(datasetId) ||
					datasetId < 1
				) {
					return json(
						{
							error: "INVALID_DATASET_ID",
							message:
								"datasetId must be a positive integer.",
						},
						{ status: 400 },
					);
				}

				if (
					!Number.isInteger(partNo) ||
					partNo < 1
				) {
					return json(
						{
							error: "INVALID_PART_NO",
							message:
								"partNo must be a positive integer.",
						},
						{ status: 400 },
					);
				}

				if (pageCount !== null && (!Number.isInteger(pageCount) || pageCount < 1)) {
					return json({ error: "INVALID_PAGE_COUNT", message: "pageCount must be a positive integer when supplied." }, { status: 400 });
				}

				if (!(file instanceof File)) {
					return json(
						{
							error: "FILE_REQUIRED",
							message:
								"A PDF file is required.",
						},
						{ status: 400 },
					);
				}

				const safeFileName =
					file.name.replace(
						/[^a-zA-Z0-9._-]/g,
						"_",
					);

				const r2Key =
					`pdf/${sectionValue}/dataset-${datasetId}/part-${partNo}/pdf-${crypto.randomUUID()}-${safeFileName}`;

				const pdfBuffer =
					await file.arrayBuffer();

				const result =
					await uploadAndAttachPdf(
						env,
						{
							section: sectionValue,
							datasetId,
							partNo,
							partName:
								typeof partNameValue === "string"
									? partNameValue.trim() || null
									: null,
							sourceFile: {
								fileName: file.name,
								fileType:
									file.type ||
									"application/pdf",
								fileSize: file.size,
							},
							pdf: {
								r2Key,
								fileName: file.name,
								fileSize: file.size,
								pageCount,
							},
						},
						pdfBuffer,
					);

				return json(
					{
						success: true,
						result,
					},
					{ status: 201 },
				);
			} catch (error) {
				return json(
					{
						error: "PDF_IMPORT_FAILED",
						message:
							error instanceof Error
								? error.message
								: "Unable to upload PDF.",
					},
					{ status: 400 },
				);
			}
		}

		// --------------------------------------------------------
		// Admin / Dataset lifecycle
		// --------------------------------------------------------
		const adminDatasetMatch = url.pathname.match(/^\/api\/admin\/(asdd|draft|discrepancy)\/datasets(?:\/(\d+)\/activate)?$/);
		if (adminDatasetMatch) {
			const section = adminDatasetMatch[1] as Section;
			const db = getDatabase(env, section);
			try {
				if (request.method === "GET" && !adminDatasetMatch[2]) {
					const result = await db.prepare(`SELECT dataset_id, version_code, version_name, status, created_at FROM dataset_versions ORDER BY dataset_id DESC`).all();
					return json({ section, datasets: result.results });
				}
				if (request.method === "POST" && !adminDatasetMatch[2]) {
					const body = await request.json<any>();
					const versionCode = typeof body?.versionCode === "string" ? body.versionCode.trim() : "";
					const versionName = typeof body?.versionName === "string" ? body.versionName.trim() : "";
					if (!versionCode || !versionName) return json({ error: "VERSION_FIELDS_REQUIRED" }, { status: 400 });
					const row = await db.prepare(`INSERT INTO dataset_versions (version_code, version_name, status, created_at) VALUES (?, ?, 'ARCHIVED', ?) RETURNING dataset_id, version_code, version_name, status, created_at`).bind(versionCode, versionName, new Date().toISOString()).first();
					return json({ success: true, dataset: row }, { status: 201 });
				}
				if (request.method === "POST" && adminDatasetMatch[2]) {
					const datasetId = Number(adminDatasetMatch[2]);
					const target = await db.prepare(`SELECT dataset_id, status FROM dataset_versions WHERE dataset_id = ? LIMIT 1`).bind(datasetId).first<{dataset_id:number;status:"ACTIVE"|"ARCHIVED"}>();
					if (!target) return json({ error: "DATASET_NOT_FOUND" }, { status: 404 });
					await db.batch([
						db.prepare(`UPDATE dataset_versions SET status = 'ARCHIVED' WHERE status = 'ACTIVE' AND dataset_id <> ?`).bind(datasetId),
						db.prepare(`UPDATE dataset_versions SET status = 'ACTIVE' WHERE dataset_id = ?`).bind(datasetId),
					]);
					return json({ success: true, section, datasetId, status: "ACTIVE" });
				}
				return json({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
			} catch (error) {
				return json({ error: "DATASET_OPERATION_FAILED", message: error instanceof Error ? error.message : "Dataset operation failed." }, { status: 400 });
			}
		}

		// --------------------------------------------------------
		// Health
		// --------------------------------------------------------

		if (url.pathname === "/api/health") {
			try {
				const results = await Promise.all([
					env.ASDD_DB.prepare("SELECT 1 AS ok").first<{ ok: number }>(),
					env.DRAFT_DB.prepare("SELECT 1 AS ok").first<{ ok: number }>(),
					env.DISCREPANCY_DB.prepare("SELECT 1 AS ok").first<{ ok: number }>(),
				]);

				return json({
					status: "ok",
					databases: {
						asdd: results[0]?.ok === 1,
						draft: results[1]?.ok === 1,
						discrepancy: results[2]?.ok === 1,
					},
				});
			} catch (error) {
				return json(
					{
						status: "error",
					},
					{ status: 500 },
				);
			}
		}

		// --------------------------------------------------------
		// Section / Version
		// --------------------------------------------------------

		const match = url.pathname.match(
			/^\/api\/(asdd|draft|discrepancy)\/version$/,
		);

		if (match) {
			const section = match[1] as Section;
			const db = getDatabase(env, section);

			try {
				const version = await db
					.prepare(`
						SELECT
							dataset_id,
							version_code,
							version_name,
							status,
							created_at
						FROM dataset_versions
						WHERE status = 'ACTIVE'
						LIMIT 1
					`)
					.first();

				if (!version) {
					return json(
						{
							error: "VERSION_NOT_FOUND",
							message: "No active dataset version found.",
						},
						{ status: 404 },
					);
				}

				return json({
					section,
					version,
				});
			} catch (error) {
				return json(
					{
						error: "DATABASE_ERROR",
						message: "Unable to read the active dataset version.",
					},
					{ status: 500 },
				);
			}
		}
		// --------------------------------------------------------
		// Section / Parts
		// --------------------------------------------------------

		const partsMatch = url.pathname.match(
			/^\/api\/(asdd|draft|discrepancy)\/parts$/,
		);

		if (partsMatch) {
			const section = partsMatch[1] as Section;
			const db = getDatabase(env, section);

			try {
				const version = await db
					.prepare(`
						SELECT
							dataset_id,
							version_code,
							version_name
						FROM dataset_versions
						WHERE status = 'ACTIVE'
						LIMIT 1
					`)
					.first();

				if (!version) {
					return json(
						{
							error: "VERSION_NOT_FOUND",
							message: "No active dataset version found.",
						},
						{ status: 404 },
					);
				}

				const result = await db
					.prepare(`
						SELECT
							part_id,
							part_no,
							part_name,
							record_count,
							status
						FROM parts
						WHERE dataset_id = ?
							AND status = 'READY'
						ORDER BY part_no ASC
					`)
					.bind(version.dataset_id)
					.all();

				return json({
					section,
					version,
					parts: result.results,
				});
			} catch (error) {
				return json(
					{
						error: "DATABASE_ERROR",
						message: "Unable to read parts.",
					},
					{ status: 500 },
				);
			}
		}
		// --------------------------------------------------------
		// Section / Search
		// --------------------------------------------------------

		const searchMatch = url.pathname.match(
			/^\/api\/(asdd|draft|discrepancy)\/search$/,
		);

		if (searchMatch) {
			const section = searchMatch[1] as Section;
			const db = getDatabase(env, section);

			const query = url.searchParams.get("query")?.trim() ?? "";
			const field = url.searchParams.get("field")?.trim() ?? "all";
			const partNoParam = url.searchParams.get("partNo");
			const cursor = url.searchParams.get("cursor");
			const limitParam = url.searchParams.get("limit");

			const allowedFields: Record<Section, string[]> = {
				draft: [
					"all",
					"serial",
					"epic",
					"name",
					"relative",
					"relation",
					"house",
					"age",
					"gender",
				],
				asdd: [
					"all",
					"serial",
					"epic",
					"name",
					"relative",
					"relation",
					"age",
					"referenceEpic",
					"reason",
				],
				discrepancy: [
					"all",
					"serial",
					"epic",
					"name",
					"age",
					"gender",
					"reason",
				],
			};

			if (!allowedFields[section].includes(field)) {
				return json(
					{
						error: "INVALID_SEARCH_FIELD",
						message: `Search field "${field}" is not available for ${section}.`,
					},
					{ status: 400 },
				);
			}

			const requestedLimit = Number(limitParam ?? "30");
			const limit = Number.isInteger(requestedLimit)
				? Math.min(Math.max(requestedLimit, 1), 100)
				: 30;

			const partNo =
				partNoParam && /^\d+$/.test(partNoParam)
					? Number(partNoParam)
					: null;

			try {
				const version = await db
					.prepare(`
						SELECT
							dataset_id,
							version_code,
							version_name
						FROM dataset_versions
						WHERE status = 'ACTIVE'
						LIMIT 1
					`)
					.first();

				if (!version) {
					return json(
						{
							error: "VERSION_NOT_FOUND",
							message: "No active dataset version found.",
						},
						{ status: 404 },
					);
				}

				let partId: number | null = null;

				if (partNo !== null) {
					const part = await db
						.prepare(`
							SELECT part_id
							FROM parts
							WHERE dataset_id = ?
								AND part_no = ?
								AND status = 'READY'
							LIMIT 1
						`)
						.bind(version.dataset_id, partNo)
						.first<{ part_id: number }>();

					if (!part) {
						return json({
							section,
							version,
							part: null,
							records: [],
							nextCursor: null,
							hasMore: false,
						});
					}

					partId = part.part_id;
				}

				const effectiveLimit = limit + 1;
				const cursorData = cursor ? decodeCursor(cursor) : null;
				const numericQuery = /^\d+$/.test(query) ? Number(query) : null;

				if (cursor && !cursorData) {
					return json(
						{
							error: "INVALID_CURSOR",
							message: "Invalid pagination cursor.",
						},
						{ status: 400 },
					);
				}

				const buildFtsQuery = (value: string) => {
					const escaped = value.replace(/"/g, '""').trim();
					return `"${escaped}"*`;
				};

				const addCursor = (
					where: string,
					params: unknown[],
					serialColumn: string,
					idColumn: string,
				) => {
					if (!cursorData) return where;

					params.push(
						cursorData.serial,
						cursorData.serial,
						cursorData.id,
					);

					return `${where}
						AND (
							${serialColumn} > ?
							OR (
								${serialColumn} = ?
								AND ${idColumn} > ?
							)
						)`;
				};

				// ------------------------------------------------
				// Draft
				// ------------------------------------------------

				if (section === "draft") {
					const params: unknown[] = [version.dataset_id];
					let where = `
						p.dataset_id = ?
						AND p.status = 'READY'
					`;
					let searchJoin = "";

					if (partId !== null) {
						where += ` AND r.part_id = ?`;
						params.push(partId);
					}

					if (query) {
						switch (field) {
							case "all":
								searchJoin = `
									JOIN draft_records_fts fts
										ON fts.rowid = r.draft_record_id
								`;
								where += `
									AND (
										draft_records_fts MATCH ?
										OR r.epic_no = ? COLLATE NOCASE
										OR r.sr_no = ?
										OR r.relation_type = ? COLLATE NOCASE
										OR r.house_number = ? COLLATE NOCASE
										OR r.age = ?
										OR r.gender = ? COLLATE NOCASE
									)
								`;
								params.push(
									buildFtsQuery(query),
									query,
									 numericQuery,
									query,
									query,
									 numericQuery,
									query,
								);
								break;
							case "serial":
								where += ` AND r.sr_no = ?`;
								params.push(numericQuery);
								break;
							case "epic":
								where += ` AND r.epic_no = ? COLLATE NOCASE`;
								params.push(query);
								break;
							case "name":
								searchJoin = `
									JOIN draft_records_fts fts
										ON fts.rowid = r.draft_record_id
								`;
								where += ` AND draft_records_fts MATCH ?`;
								params.push(buildFtsQuery(query));
								break;
							case "relative":
								searchJoin = `
									JOIN draft_records_fts fts
										ON fts.rowid = r.draft_record_id
								`;
								where += ` AND draft_records_fts MATCH ?`;
								params.push(`relative_name:${buildFtsQuery(query)}`);
								break;
							case "relation":
								where += ` AND r.relation_type = ? COLLATE NOCASE`;
								params.push(query);
								break;
							case "house":
								where += ` AND r.house_number = ? COLLATE NOCASE`;
								params.push(query);
								break;
							case "age":
								if (!/^\d+$/.test(query)) {
									return json({
										section,
										version,
										part: partId !== null ? { partNo } : null,
										records: [],
										nextCursor: null,
										hasMore: false,
									});
								}
								where += ` AND r.age = ?`;
								params.push(numericQuery);
								break;
							case "gender":
								where += ` AND r.gender = ? COLLATE NOCASE`;
								params.push(query);
								break;
						}
					}

					where = addCursor(
						where,
						params,
						"r.sr_no",
						"r.draft_record_id",
					);
					params.push(effectiveLimit);

					const result = await db
						.prepare(`
							SELECT
								r.draft_record_id,
								r.part_id,
								r.sr_no,
								r.epic_no,
								r.name,
								r.relation_type,
								r.relative_name,
								r.house_number,
								r.age,
								r.gender,
								r.pdf_id,
								r.pdf_page,
								r.pdf_box,
								r.grid_row,
								r.grid_col,
								r.source_file_id
							FROM draft_records r
							JOIN parts p ON p.part_id = r.part_id
							${searchJoin}
							WHERE ${where}
							ORDER BY r.sr_no ASC, r.draft_record_id ASC
							LIMIT ?
						`)
						.bind(...params)
						.all();

					const rows = result.results ?? [];
					const hasMore = rows.length > limit;
					const records = hasMore ? rows.slice(0, limit) : rows;
					const last = records[records.length - 1];

					return json({
						section,
						version,
						part: partId !== null ? { partNo } : null,
						records,
						nextCursor:
							hasMore && last
								? encodeCursor(Number(last.sr_no), Number(last.draft_record_id))
								: null,
						hasMore,
					});
				}

				// ------------------------------------------------
				// ASDD
				// ------------------------------------------------

				if (section === "asdd") {
					const params: unknown[] = [version.dataset_id];
					let where = `
						p.dataset_id = ?
						AND p.status = 'READY'
					`;
					let searchJoin = "";

					if (partId !== null) {
						where += ` AND r.part_id = ?`;
						params.push(partId);
					}

					if (query) {
						switch (field) {
							case "all":
								searchJoin = `
									JOIN asdd_records_fts fts
										ON fts.rowid = r.asdd_record_id
								`;
								where += `
									AND (
										asdd_records_fts MATCH ?
										OR r.epic_no = ? COLLATE NOCASE
										OR r.serial_no = ?
										OR r.relation_type = ? COLLATE NOCASE
										OR r.age = ?
										OR r.reference_epic = ? COLLATE NOCASE
										OR r.uncollectable_reason_raw = ? COLLATE NOCASE
									)
								`;
								params.push(
									buildFtsQuery(query),
									query,
									numericQuery,
									query,
									numericQuery,
									query,
									query,
								);
								break;
							case "serial":
								where += ` AND r.serial_no = ?`;
								params.push(numericQuery);
								break;
							case "epic":
								where += ` AND r.epic_no = ? COLLATE NOCASE`;
								params.push(query);
								break;
							case "name":
								searchJoin = `JOIN asdd_records_fts fts ON fts.rowid = r.asdd_record_id`;
								where += ` AND asdd_records_fts MATCH ?`;
								params.push(buildFtsQuery(query));
								break;
							case "relative":
								searchJoin = `JOIN asdd_records_fts fts ON fts.rowid = r.asdd_record_id`;
								where += ` AND asdd_records_fts MATCH ?`;
								params.push(`relative_name:${buildFtsQuery(query)}`);
								break;
							case "relation":
								where += ` AND r.relation_type = ? COLLATE NOCASE`;
								params.push(query);
								break;
							case "age":
								if (!/^\d+$/.test(query)) {
									return json({ section, version, part: partId !== null ? { partNo } : null, records: [], nextCursor: null, hasMore: false });
								}
								where += ` AND r.age = ?`;
								params.push(numericQuery);
								break;
							case "referenceEpic":
								where += ` AND r.reference_epic = ? COLLATE NOCASE`;
								params.push(query);
								break;
							case "reason":
								searchJoin = `JOIN asdd_records_fts fts ON fts.rowid = r.asdd_record_id`;
								where += ` AND asdd_records_fts MATCH ?`;
								params.push(`reason:${buildFtsQuery(query)}`);
								break;
						}
					}

					where = addCursor(where, params, "r.serial_no", "r.asdd_record_id");
					params.push(effectiveLimit);

					const result = await db
						.prepare(`
							SELECT
								r.asdd_record_id,
								r.part_id,
								r.serial_no,
								r.epic_no,
								r.name,
								r.relative_details_raw,
								r.relative_name,
								r.relation_type,
								r.age,
								r.reference_epic,
								r.uncollectable_reason_raw,
								r.uncollectable_reason_code,
								r.pdf_id,
								r.pdf_page,
								r.pdf_box,
								r.source_file_id
							FROM asdd_records r
							JOIN parts p ON p.part_id = r.part_id
							${searchJoin}
							WHERE ${where}
							ORDER BY r.serial_no ASC, r.asdd_record_id ASC
							LIMIT ?
						`)
						.bind(...params)
						.all();

					const rows = result.results ?? [];
					const hasMore = rows.length > limit;
					const records = hasMore ? rows.slice(0, limit) : rows;
					const last = records[records.length - 1];

					return json({
						section,
						version,
						part: partId !== null ? { partNo } : null,
						records,
						nextCursor:
							hasMore && last
								? encodeCursor(Number(last.serial_no), Number(last.asdd_record_id))
								: null,
						hasMore,
					});
				}

				// ------------------------------------------------
				// Discrepancy
				// ------------------------------------------------

				const params: unknown[] = [version.dataset_id];
				let where = `
					p.dataset_id = ?
					AND p.status = 'READY'
				`;
				let searchJoin = "";

				if (partId !== null) {
					where += ` AND r.part_id = ?`;
					params.push(partId);
				}

				if (query) {
					switch (field) {
						case "all":
							searchJoin = `JOIN discrepancy_records_fts fts ON fts.rowid = r.discrepancy_record_id`;
							where += `
								AND (
									discrepancy_records_fts MATCH ?
									OR r.epic_no = ? COLLATE NOCASE
									OR r.part_serial_number = ?
									OR r.age = ?
									OR r.gender = ? COLLATE NOCASE
									OR r.reason_raw = ? COLLATE NOCASE
								)
							`;
							params.push(buildFtsQuery(query), query, numericQuery, numericQuery, query, query);
							break;
						case "serial":
							where += ` AND r.part_serial_number = ?`;
							params.push(numericQuery);
							break;
						case "epic":
							where += ` AND r.epic_no = ? COLLATE NOCASE`;
							params.push(query);
							break;
						case "name":
							searchJoin = `JOIN discrepancy_records_fts fts ON fts.rowid = r.discrepancy_record_id`;
							where += ` AND discrepancy_records_fts MATCH ?`;
							params.push(buildFtsQuery(query));
							break;
						case "age":
							if (!/^\d+$/.test(query)) {
								return json({ section, version, part: partId !== null ? { partNo } : null, records: [], nextCursor: null, hasMore: false });
							}
							where += ` AND r.age = ?`;
							params.push(numericQuery);
							break;
						case "gender":
							where += ` AND r.gender = ? COLLATE NOCASE`;
							params.push(query);
							break;
						case "reason":
							searchJoin = `JOIN discrepancy_records_fts fts ON fts.rowid = r.discrepancy_record_id`;
							where += ` AND discrepancy_records_fts MATCH ?`;
							params.push(`reason:${buildFtsQuery(query)}`);
							break;
					}
				}

				where = addCursor(where, params, "r.part_serial_number", "r.discrepancy_record_id");
				params.push(effectiveLimit);

				const result = await db
					.prepare(`
						SELECT
							r.discrepancy_record_id,
							r.part_id,
							r.part_serial_number,
							r.epic_no,
							r.name,
							r.age,
							r.gender,
							r.reason_raw,
							r.pdf_id,
							r.pdf_page,
							r.pdf_box,
							r.source_file_id
						FROM discrepancy_records r
						JOIN parts p ON p.part_id = r.part_id
						${searchJoin}
						WHERE ${where}
						ORDER BY r.part_serial_number ASC, r.discrepancy_record_id ASC
						LIMIT ?
					`)
					.bind(...params)
					.all();

				const rows = result.results ?? [];
				const hasMore = rows.length > limit;
				const records = hasMore ? rows.slice(0, limit) : rows;
				const last = records[records.length - 1];

				return json({
					section,
					version,
					part: partId !== null ? { partNo } : null,
					records,
					nextCursor:
						hasMore && last
							? encodeCursor(Number(last.part_serial_number), Number(last.discrepancy_record_id))
							: null,
					hasMore,
				});
			} catch (error) {
				return json(
					{
						error: "DATABASE_ERROR",
						message: "Unable to search records.",
					},
					{ status: 500 },
				);
			}
		}
		// --------------------------------------------------------
		// Section / Exact EPIC Lookup
		// --------------------------------------------------------

		const epicMatch = url.pathname.match(
			/^\/api\/(asdd|draft|discrepancy)\/by-epic\/([^/]+)$/,
		);

		if (epicMatch) {
			const section = epicMatch[1] as Section;
			const epicNo = decodeURIComponent(epicMatch[2]).trim();
			const db = getDatabase(env, section);

			try {
				const version = await db
					.prepare(`
				SELECT
					dataset_id,
					version_code,
					version_name
				FROM dataset_versions
				WHERE status = 'ACTIVE'
				LIMIT 1
			`)
					.first();

				if (!version) {
					return json(
						{
							error: "VERSION_NOT_FOUND",
							message: "No active dataset version found.",
						},
						{ status: 404 },
					);
				}

				let record;

				if (section === "asdd") {
					record = await db
						.prepare(`
					SELECT
						r.asdd_record_id,
						r.part_id,
						r.serial_no,
						r.epic_no,
						r.name,
						r.relative_details_raw,
						r.relative_name,
						r.relation_type,
						r.age,
						r.reference_epic,
						r.uncollectable_reason_raw,
						r.uncollectable_reason_code,
						r.pdf_id,
						r.pdf_page,
						r.pdf_box,
						r.source_file_id
					FROM asdd_records r
					JOIN parts p ON p.part_id = r.part_id
					WHERE p.dataset_id = ?
						AND p.status = 'READY'
						AND r.epic_no = ?
					LIMIT 1
				`)
						.bind(version.dataset_id, epicNo)
						.first();
				} else if (section === "draft") {
					record = await db
						.prepare(`
					SELECT
						r.draft_record_id,
						r.part_id,
						r.sr_no,
						r.epic_no,
						r.name,
						r.relation_type,
						r.relative_name,
						r.house_number,
						r.age,
						r.gender,
						r.pdf_id,
						r.pdf_page,
						r.pdf_box,
						r.grid_row,
						r.grid_col,
						r.source_file_id
					FROM draft_records r
					JOIN parts p ON p.part_id = r.part_id
					WHERE p.dataset_id = ?
						AND p.status = 'READY'
						AND r.epic_no = ?
					LIMIT 1
				`)
						.bind(version.dataset_id, epicNo)
						.first();
				} else {
					record = await db
						.prepare(`
					SELECT
						r.discrepancy_record_id,
						r.part_id,
						r.part_serial_number,
						r.epic_no,
						r.name,
						r.age,
						r.gender,
						r.reason_raw,
						r.pdf_id,
						r.pdf_page,
						r.pdf_box,
						r.source_file_id
					FROM discrepancy_records r
					JOIN parts p ON p.part_id = r.part_id
					WHERE p.dataset_id = ?
						AND p.status = 'READY'
						AND r.epic_no = ?
					LIMIT 1
				`)
						.bind(version.dataset_id, epicNo)
						.first();
				}

				if (!record) {
					return json(
						{
							error: "RECORD_NOT_FOUND",
							message: "Record not found.",
						},
						{ status: 404 },
					);
				}

				return json({
					section,
					version,
					record,
				});
			} catch (error) {
				return json(
					{
						error: "DATABASE_ERROR",
						message: "Unable to find record.",
					},
					{ status: 500 },
				);
			}
		}

		// --------------------------------------------------------
		// Section / Record Detail
		// --------------------------------------------------------

		const recordMatch = url.pathname.match(
			/^\/api\/(asdd|draft|discrepancy)\/records\/(\d+)$/,
		);

		if (recordMatch) {
			const section = recordMatch[1] as Section;
			const recordId = Number(recordMatch[2]);
			const db = getDatabase(env, section);

			try {
				const version = await db
					.prepare(`
				SELECT
					dataset_id,
					version_code,
					version_name
				FROM dataset_versions
				WHERE status = 'ACTIVE'
				LIMIT 1
			`)
					.first();

				if (!version) {
					return json(
						{
							error: "VERSION_NOT_FOUND",
							message: "No active dataset version found.",
						},
						{ status: 404 },
					);
				}

				let record;

				if (section === "asdd") {
					record = await db
						.prepare(`
					SELECT
						r.asdd_record_id,
						r.part_id,
						r.serial_no,
						r.epic_no,
						r.name,
						r.relative_details_raw,
						r.relative_name,
						r.relation_type,
						r.age,
						r.reference_epic,
						r.uncollectable_reason_raw,
						r.uncollectable_reason_code,
						r.pdf_id,
						r.pdf_page,
						r.pdf_box,
						r.source_file_id
					FROM asdd_records r
					JOIN parts p ON p.part_id = r.part_id
					WHERE p.dataset_id = ?
						AND p.status = 'READY'
						AND r.asdd_record_id = ?
					LIMIT 1
				`)
						.bind(version.dataset_id, recordId)
						.first();
				} else if (section === "draft") {
					record = await db
						.prepare(`
					SELECT
						r.draft_record_id,
						r.part_id,
						r.sr_no,
						r.epic_no,
						r.name,
						r.relation_type,
						r.relative_name,
						r.house_number,
						r.age,
						r.gender,
						r.pdf_id,
						r.pdf_page,
						r.pdf_box,
						r.grid_row,
						r.grid_col,
						r.source_file_id
					FROM draft_records r
					JOIN parts p ON p.part_id = r.part_id
					WHERE p.dataset_id = ?
						AND p.status = 'READY'
						AND r.draft_record_id = ?
					LIMIT 1
				`)
						.bind(version.dataset_id, recordId)
						.first();
				} else {
					record = await db
						.prepare(`
					SELECT
						r.discrepancy_record_id,
						r.part_id,
						r.part_serial_number,
						r.epic_no,
						r.name,
						r.age,
						r.gender,
						r.reason_raw,
						r.pdf_id,
						r.pdf_page,
						r.pdf_box,
						r.source_file_id
					FROM discrepancy_records r
					JOIN parts p ON p.part_id = r.part_id
					WHERE p.dataset_id = ?
						AND p.status = 'READY'
						AND r.discrepancy_record_id = ?
					LIMIT 1
				`)
						.bind(version.dataset_id, recordId)
						.first();
				}

				if (!record) {
					return json(
						{
							error: "RECORD_NOT_FOUND",
							message: "Record not found.",
						},
						{ status: 404 },
					);
				}

				return json({
					section,
					version,
					record,
				});
			} catch (error) {
				return json(
					{
						error: "DATABASE_ERROR",
						message: "Unable to read record.",
					},
					{ status: 500 },
				);
			}
		}

		// --------------------------------------------------------
		// --------------------------------------------------------
		// PDF / File
		// --------------------------------------------------------

		const pdfFileMatch = url.pathname.match(
			/^\/api\/(asdd|draft|discrepancy)\/pdf\/(\d+)\/file$/,
		);

		if (pdfFileMatch) {
			const section = pdfFileMatch[1] as Section;
			const pdfId = Number(pdfFileMatch[2]);
			const db = getDatabase(env, section);

			try {
				const pdf = await db
					.prepare(`
						SELECT
							pdf_id,
							r2_key,
							file_name,
							file_size,
							status
						FROM pdf_documents
						WHERE pdf_id = ?
						LIMIT 1
					`)
					.bind(pdfId)
					.first<{
						pdf_id: number;
						r2_key: string;
						file_name: string;
						file_size: number;
						status: string;
					}>();

				if (!pdf || pdf.status !== "READY") {
					return json(
						{
							error: "PDF_NOT_FOUND",
							message: "PDF not found.",
						},
						{ status: 404 },
					);
				}

				const rangeHeader = request.headers.get("Range");
				let range: { offset: number; length: number } | undefined;
				if (rangeHeader) {
					const match = rangeHeader.match(/^bytes=(\d+)-(\d*)$/);
					if (match) {
						const offset = Number(match[1]);
						const end = match[2] ? Number(match[2]) : undefined;
						if (Number.isInteger(offset) && offset >= 0 && (end === undefined || end >= offset)) {
							range = end === undefined ? { offset, length: 100 * 1024 * 1024 } : { offset, length: end - offset + 1 };
						}
					}
				}
				const object = await env.PDF_BUCKET.get(pdf.r2_key, range ? { range } : undefined);

				if (!object) {
					return json(
						{
							error: "PDF_FILE_NOT_FOUND",
							message: "PDF file is not available in storage.",
						},
						{ status: 404 },
					);
				}

				const headers = new Headers(CORS_HEADERS);
				headers.set(
					"Content-Type",
					object.httpMetadata?.contentType || "application/pdf",
				);
				headers.set("Content-Length", String(object.size));
				headers.set("Accept-Ranges", "bytes");
				headers.set("Content-Disposition", `inline; filename="${pdf.file_name.replace(/"/g, "")}"`);

				if (object.httpEtag) {
					headers.set("ETag", object.httpEtag);
				}

				if (object.range && "offset" in object.range) {
					headers.set(
						"Content-Range",
						`bytes ${Number(object.range.offset)}-${Number(object.range.offset) + Number(object.range.length) - 1}/${object.size}`,
					);
				}

				return new Response(object.body, {
					status: object.range && "offset" in object.range ? 206 : 200,
					headers,
				});
			} catch {
				return json(
					{
						error: "PDF_READ_FAILED",
						message: "Unable to read PDF file.",
					},
					{ status: 500 },
				);
			}
		}


		// PDF / Metadata
		// --------------------------------------------------------

		const pdfMatch = url.pathname.match(
			/^\/api\/(asdd|draft|discrepancy)\/pdf\/(\d+)$/,
		);

		if (pdfMatch) {
			const section = pdfMatch[1] as Section;
			const pdfId = Number(pdfMatch[2]);
			const db = getDatabase(env, section);

			try {
				const pdf = await db
					.prepare(`
				SELECT
					pdf_id,
					part_id,
					source_file_id,
					r2_key,
					file_name,
					file_size,
					page_count,
					checksum,
					status
				FROM pdf_documents
				WHERE pdf_id = ?
				LIMIT 1
			`)
					.bind(pdfId)
					.first();

				if (!pdf) {
					return json(
						{
							error: "PDF_NOT_FOUND",
							message: "PDF not found.",
						},
						{ status: 404 },
					);
				}

				return json({
					section,
					pdf: {
						...pdf,
						page_count: pdf.page_count === 0 ? null : pdf.page_count,
					},
				});
			} catch (error) {
				return json(
					{
						error: "DATABASE_ERROR",
						message: "Unable to read PDF metadata.",
					},
					{ status: 500 },
				);
			}
		}
		return new Response("SIR Panvel API", {
	headers: CORS_HEADERS,
});
	},
} satisfies ExportedHandler<Env>;