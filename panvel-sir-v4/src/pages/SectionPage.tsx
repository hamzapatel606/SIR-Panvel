import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getParts, searchRecords, type Part, type Section } from "../services/api";
import PartSelector from "../components/PartSelector";
import Pagination from "../components/Pagination";
import RecordCard from "../components/RecordCard";
import RecordDetailsModal from "../components/RecordDetailsModal";
import SectionHero from "../components/SectionHero";
import StatsCards from "../components/StatsCards";
import type { RecordItem } from "../utils/records";

interface SectionPageProps {
	section: Section;
	title: string;
	description: string;
}

const PAGE_SIZE = 30;

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

export default function SectionPage({ section, title, description }: SectionPageProps) {
	const [searchParams] = useSearchParams();

	const [parts, setParts] = useState<Part[]>([]);
	const [query, setQuery] = useState("");
	const [searchField, setSearchField] = useState<SearchField>("all");
	const [partNo, setPartNo] = useState("");

	const [records, setRecords] = useState<RecordItem[]>([]);
	const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
	const [pageIndex, setPageIndex] = useState(0);
	const [nextCursor, setNextCursor] = useState<string | null>(null);
	const [hasMore, setHasMore] = useState(false);

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [selectedRecord, setSelectedRecord] = useState<RecordItem | null>(null);

	useEffect(() => {
		async function loadParts() {
			try {
				const result = await getParts(section);
				setParts(result.parts);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Unable to load parts");
			}
		}

		loadParts();
	}, [section]);

	async function fetchPage(
		cursor: string | undefined,
		targetPageIndex: number,
		selectedPartNo: string,
		selectedField: SearchField,
		selectedQuery: string,
	) {
		setLoading(true);
		setError("");

		try {
			const result = await searchRecords(
				section,
				selectedQuery,
				selectedField,
				selectedPartNo ? Number(selectedPartNo) : undefined,
				cursor,
				PAGE_SIZE,
			);

			setRecords(result.records as RecordItem[]);
			setNextCursor(result.nextCursor);
			setHasMore(result.hasMore);
			setPageIndex(targetPageIndex);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Search failed");
		} finally {
			setLoading(false);
		}
	}

	function runNewSearch(selectedPartNo = partNo, selectedField = searchField, selectedQuery = query) {
		setCursorHistory([undefined]);
		fetchPage(undefined, 0, selectedPartNo, selectedField, selectedQuery);
	}

	useEffect(() => {
	const urlQuery = searchParams.get("query") ?? "";
	const urlSearchField =
		(searchParams.get("searchField") as SearchField | null) ?? "all";

	setQuery(urlQuery);
	setSearchField(urlSearchField);
	setPartNo("");

	setCursorHistory([undefined]);

	fetchPage(
		undefined,
		0,
		"",
		urlSearchField,
		urlQuery,
	);

	// eslint-disable-next-line react-hooks/exhaustive-deps
}, [section, searchParams]);

	function handlePartChange(value: string) {
		setPartNo(value);
		runNewSearch(value, searchField, query);
	}

	function handleNext() {
		if (!hasMore || !nextCursor) return;
		const targetIndex = pageIndex + 1;
		setCursorHistory((history) => [...history.slice(0, targetIndex), nextCursor]);
		fetchPage(nextCursor, targetIndex, partNo, searchField, query);
	}

	function handlePrevious() {
		if (pageIndex === 0) return;
		const targetIndex = pageIndex - 1;
		const cursor = cursorHistory[targetIndex];
		fetchPage(cursor, targetIndex, partNo, searchField, query);
	}

	const totalParts = parts.length;
	const totalRecords = useMemo(
		() => parts.reduce((sum, part) => sum + (part.record_count ?? 0), 0),
		[parts],
	);

	const stats = [
		{ label: "Total Parts", value: totalParts ? totalParts.toLocaleString() : "—" },
		{ label: "Total Records", value: totalRecords ? totalRecords.toLocaleString() : "—" },
		{ label: "Election Year", value: "2026" },
		{ label: "Assembly Constituency", value: "Panvel · 188" },
	];

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
										: "Enter EPIC number, name or other details...";

	const startIndex = records.length === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
	const endIndex = pageIndex * PAGE_SIZE + records.length;

	return (
		<section className={`section-page section-theme-${section}`}>
			<SectionHero section={section} title={title} description={description} />

			<StatsCards stats={stats} />

			<div className="search-panel">
	<div className="search-panel-row">
		<div className="search-control search-control-query">
			<label htmlFor={`${section}-query`}>
				Search Voter Records
			</label>

			<input
				id={`${section}-query`}
				type="search"
				value={query}
				placeholder={placeholder}
				onChange={(event) => setQuery(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === "Enter") {
						runNewSearch();
					}
				}}
			/>
		</div>

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
			<label htmlFor={`${section}-part`}>Select Part</label>

			<PartSelector
				id={`${section}-part`}
				parts={parts}
				value={partNo}
				onChange={handlePartChange}
			/>
		</div>

		<button
			type="button"
			className="search-button"
			onClick={() => runNewSearch()}
			disabled={loading}
		>
			Search
		</button>
	</div>
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
					<span>{records.length === 0 ? "No records displayed" : `Showing ${records.length} records`}</span>
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

			{!loading && records.length > 0 && (
				<div className="record-list">
					{records.map((record, index) => {
						const key = String(
							record.asdd_record_id ?? record.draft_record_id ?? record.discrepancy_record_id ?? "",
						);

						return (
							<RecordCard
								key={key || `${section}-${index}`}
								section={section}
								record={record}
								parts={parts}
								onOpenDetails={setSelectedRecord}
							/>
						);
					})}
				</div>
			)}

			<Pagination
				startIndex={startIndex}
				endIndex={endIndex}
				canGoPrevious={pageIndex > 0}
				canGoNext={hasMore}
				loading={loading}
				onPrevious={handlePrevious}
				onNext={handleNext}
			/>

			{selectedRecord && (
				<RecordDetailsModal
					section={section}
					record={selectedRecord}
					parts={parts}
					onClose={() => setSelectedRecord(null)}
				/>
			)}
		</section>
	);
}
