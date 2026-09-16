import { useEffect, useState } from "react";
import { getParts, searchRecords, type Section } from "../services/api";
const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

interface SectionPageProps {
	section: Section;
	title: string;
	description: string;
}

interface RecordItem {
	[key: string]: unknown;
}

interface Part {
	part_id: number;
	part_no: number;
	part_name: string | null;
	record_count: number;
	status: "READY";
}

type SearchField =
	| "all"
	| "serial"
	| "epic"
	| "name"
	| "relative"
	| "relation"
	| "house"
	| "age"
	| "gender"
	| "referenceEpic"
	| "reason";

const SEARCH_FIELDS_BY_SECTION: Record<
	Section,
	{ value: SearchField; label: string }[]
> = {
	draft: [
		{ value: "all", label: "All" },
		{ value: "serial", label: "Elector Sr No" },
		{ value: "epic", label: "EPIC No" },
		{ value: "name", label: "Name" },
		{ value: "relative", label: "Relative Name" },
		{ value: "relation", label: "Relation" },
		{ value: "house", label: "House No" },
		{ value: "age", label: "Age" },
		{ value: "gender", label: "Gender" },
	],
	asdd: [
		{ value: "all", label: "All" },
		{ value: "serial", label: "Elector Sr No" },
		{ value: "epic", label: "EPIC No" },
		{ value: "name", label: "Name" },
		{ value: "relative", label: "Relative Name" },
		{ value: "relation", label: "Relation" },
		{ value: "age", label: "Age" },
		{ value: "referenceEpic", label: "Reference EPIC" },
		{ value: "reason", label: "Reason" },
	],
	discrepancy: [
		{ value: "all", label: "All" },
		{ value: "serial", label: "Elector Sr No" },
		{ value: "epic", label: "EPIC No" },
		{ value: "name", label: "Name" },
		{ value: "age", label: "Age" },
		{ value: "gender", label: "Gender" },
		{ value: "reason", label: "Reason" },
	],
};

function getRecordId(record: RecordItem) {
	return String(
		record.asdd_record_id ??
			record.draft_record_id ??
			record.discrepancy_record_id ??
			"",
	);
}

function getSerial(record: RecordItem) {
	return String(
		record.serial_no ??
			record.sr_no ??
			record.part_serial_number ??
			"—",
	);
}

function display(value: unknown) {
	return value === null || value === undefined || value === ""
		? "—"
		: String(value);
}

function getPartNo(record: RecordItem, parts: Part[]) {
	return (
		parts.find(
			(part) => part.part_id === Number(record.part_id),
		)?.part_no ?? record.part_no ?? "—"
	);
}

function Field({
	label,
	value,
	wide = false,
}: {
	label: string;
	value: unknown;
	wide?: boolean;
}) {
	return (
		<div className={wide ? "record-field record-field-wide" : "record-field"}>
			<span className="record-field-label">{label}</span>
			<span className="record-field-value">{display(value)}</span>
		</div>
	);
}

function SectionRecordCard({
	section,
	record,
	parts,
}: {
	section: Section;
	record: RecordItem;
	parts: Part[];
}) {
	const epic = display(record.epic_no);
	const hasPdf = record.pdf_id !== null && record.pdf_id !== undefined;

	function crossSectionButton(target: Section) {
		const label =
			target === "asdd"
				? "View in ASDD"
				: target === "draft"
					? "View in Draft"
					: "View in Discrepancy";

		return (
			<button
				type="button"
				className="card-action card-action-secondary"
				onClick={() => {
					// Cross-section lookup will be wired to the exact-EPIC
					// endpoint when the search API step is implemented.
					console.info(`View ${target} for EPIC ${epic}`);
				}}
			>
				{label}
			</button>
		);
	}

	return (
		<article className={`record-card record-card-${section}`}>
			<div className="record-card-top">
				<div>
					<span className="record-card-kicker">
						{section === "draft"
							? "DRAFT ELECTOR"
							: section === "asdd"
								? "ASDD RECORD"
								: "DISCREPANCY RECORD"}
					</span>
					<h2>{display(record.name ?? record.elector_name)}</h2>
				</div>

				<div className="record-serial">
					<span>Sr No</span>
					<strong>{getSerial(record)}</strong>
				</div>
			</div>

			<div className="record-fields">
				{section === "draft" && (
					<>
						<Field label="EPIC No" value={record.epic_no} />
						<Field label="Part" value={getPartNo(record, parts)} />
						<Field label="Relative Name" value={record.relative_name} wide />
						<Field label="Relation" value={record.relation_type} />
						<Field label="Age" value={record.age} />
						<Field label="Gender" value={record.gender} />
						<Field label="House No" value={record.house_number} />
					</>
				)}

				{section === "asdd" && (
					<>
						<Field label="EPIC No" value={record.epic_no} />
						<Field label="Part" value={getPartNo(record, parts)} />
						<Field
							label="Relative Details"
							value={record.relative_details_raw ?? record.relative_name}
							wide
						/>
						<Field label="Age" value={record.age} />
						<Field
							label="Reason"
							value={record.uncollectable_reason_raw}
							wide
						/>
						<Field label="Reference EPIC" value={record.reference_epic} />
					</>
				)}

				{section === "discrepancy" && (
					<>
						<Field label="EPIC No" value={record.epic_no} />
						<Field label="Part" value={getPartNo(record, parts)} />
						<Field label="Age" value={record.age} />
						<Field label="Gender" value={record.gender} />
						<Field label="Reason" value={record.reason_raw} wide />
					</>
				)}
			</div>

			<div className="card-actions">
				<button
					type="button"
					className={`card-action card-action-pdf${!hasPdf ? " is-unavailable" : ""}`}
					disabled={!hasPdf}
					onClick={() => {
	if (hasPdf) {
		const pdfUrl = `${API_BASE_URL}/api/${section}/pdf/${String(
	record.pdf_id,
)}/file#page=${String(record.pdf_page)}`;
		window.open(pdfUrl, "_blank", "noopener,noreferrer");
	}
}}
				>
					{hasPdf ? "View in PDF" : "PDF Not Available"}
				</button>

				<div className="card-action-row">
					{section !== "asdd" && crossSectionButton("asdd")}
					{section !== "draft" && crossSectionButton("draft")}
					{section !== "discrepancy" &&
						crossSectionButton("discrepancy")}
				</div>
			</div>
		</article>
	);
}

export default function SectionPage({
	section,
	title,
	description,
}: SectionPageProps) {
	const [parts, setParts] = useState<Part[]>([]);
	const [query, setQuery] = useState("");
	const [searchField, setSearchField] = useState<SearchField>("all");
	const [partNo, setPartNo] = useState("");
	const [records, setRecords] = useState<RecordItem[]>([]);
	const [nextCursor, setNextCursor] = useState<string | null>(null);
	const [hasMore, setHasMore] = useState(false);
	const [loading, setLoading] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		async function initialize() {
			setError("");

			try {
				const result = await getParts(section);
				setParts(result.parts);
			} catch (err) {
				setError(
					err instanceof Error
						? err.message
						: "Unable to load parts",
				);
			}
		}

		initialize();
	}, [section]);

	async function search(
		reset = true,
		selectedPartNo = partNo,
		selectedField = searchField,
	) {
		if (reset) {
			setLoading(true);
		} else {
			setLoadingMore(true);
		}

		setError("");

		try {
			const result = await searchRecords(
				section,
				query,
				selectedField,
				selectedPartNo ? Number(selectedPartNo) : undefined,
				reset ? undefined : nextCursor ?? undefined,
				30,
			);

			const newRecords = result.records as RecordItem[];

			if (reset) {
				setRecords(newRecords);
			} else {
				setRecords((current) => [...current, ...newRecords]);
			}

			setNextCursor(result.nextCursor);
			setHasMore(result.hasMore);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Search failed",
			);
		} finally {
			setLoading(false);
			setLoadingMore(false);
		}
	}

	useEffect(() => {
		search();
	}, [section]);

	function handlePartChange(value: string) {
		setPartNo(value);
		search(true, value, searchField);
	}

	const placeholder =
		searchField === "epic"
			? "Enter EPIC number..."
			: searchField === "serial"
				? "Enter elector serial number..."
				: searchField === "age"
					? "Enter age..."
					: searchField === "gender"
						? "Enter gender..."
						: searchField === "house"
							? "Enter house number..."
							: searchField === "relation"
								? "Enter relation..."
								: searchField === "relative"
									? "Search relative name..."
									: searchField === "name"
										? "Search elector name..."
										: "Search voter records...";

	return (
		<section className="section-page">
			<div className="page-header">
				<div>
					<span className="page-eyebrow">SIR PANVEL</span>
					<h1>{title}</h1>
					<p>{description}</p>
				</div>
			</div>

			<div className="search-panel">
				<div className="search-control">
					<label htmlFor={`${section}-search-field`}>Search by</label>
					<select
						id={`${section}-search-field`}
						value={searchField}
						onChange={(event) =>
							setSearchField(event.target.value as SearchField)
						}
					>
						{SEARCH_FIELDS_BY_SECTION[section].map((field) => (
							<option key={field.value} value={field.value}>
								{field.label}
							</option>
						))}
					</select>
				</div>

				<div className="search-control search-control-part">
					<label htmlFor={`${section}-part`}>Part</label>
					<select
						id={`${section}-part`}
						value={partNo}
						onChange={(event) =>
							handlePartChange(event.target.value)
						}
					>
						<option value="">All Parts</option>
						{parts.map((part) => (
							<option key={part.part_id} value={part.part_no}>
								Part {part.part_no}
								{part.part_name ? ` — ${part.part_name}` : ""}
							</option>
						))}
					</select>
				</div>

				<div className="search-control search-control-query">
					<label htmlFor={`${section}-query`}>Search</label>
					<input
						id={`${section}-query`}
						type="search"
						value={query}
						placeholder={placeholder}
						onChange={(event) => setQuery(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								search();
							}
						}}
					/>
				</div>

				<button
					type="button"
					className="search-button"
					onClick={() => search()}
					disabled={loading}
				>
					Search
				</button>
			</div>

			{error && (
				<div className="error-message">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						aria-hidden="true"
						style={{ width: 16, height: 16, flex: "0 0 auto", marginTop: 2 }}
					>
						<circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
						<path d="M12 8v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
						<circle cx="12" cy="16" r="0.9" fill="currentColor" stroke="none" />
					</svg>
					<span>{error}</span>
				</div>
			)}

			<div className="results-toolbar">
				<div>
					<strong>{title}</strong>
					<span>
						{records.length === 0
							? "No records displayed"
							: `Showing ${records.length} records`}
					</span>
				</div>
			</div>

			{loading && (
				<div className="skeleton-grid" aria-hidden="true">
					{Array.from({ length: 6 }).map((_, index) => (
						<div className="skeleton-card" key={index}>
							<div className="skeleton-line skeleton-line-title" />
							<div className="skeleton-line" />
							<div className="skeleton-line" />
							<div className="skeleton-line skeleton-line-sm" />
						</div>
					))}
				</div>
			)}

			{!loading && records.length === 0 && !error && (
				<div className="empty-state">
					<div className="empty-icon">
						<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
							<path d="m19.5 19.5-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
						</svg>
					</div>
					<strong>No records found</strong>
					<span>Try another search or select a different Part.</span>
				</div>
			)}

			<div className="record-list">
				{records.map((record, index) => {
					const recordId = getRecordId(record);

					return (
						<SectionRecordCard
							key={recordId || `${section}-${index}`}
							section={section}
							record={record}
							parts={parts}
						/>
					);
				})}
			</div>

			{hasMore && nextCursor && (
				<div className="load-more-container">
					<button
						type="button"
						className="load-more"
						onClick={() => search(false)}
						disabled={loadingMore}
					>
						{loadingMore ? "Loading…" : "Load More Records"}
					</button>
				</div>
			)}
		</section>
	);
}
