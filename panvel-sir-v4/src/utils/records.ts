import type { Part, Section } from "../services/api";

export interface RecordItem {
	[key: string]: unknown;
}

export interface FieldRow {
	label: string;
	value?: unknown;
	wide?: boolean;
	icon?: string;
	/** When present, render as a bulleted list instead of a single value. */
	list?: string[];
}

export function display(value: unknown) {
	return value === null || value === undefined || value === ""
		? "—"
		: String(value);
}

export function hasValue(value: unknown) {
	return value !== null && value !== undefined && String(value).trim() !== "";
}

export function getRecordId(record: RecordItem) {
	return String(
		record.asdd_record_id ??
			record.draft_record_id ??
			record.discrepancy_record_id ??
			"",
	);
}

export function getSerial(record: RecordItem) {
	return String(
		record.serial_no ?? record.sr_no ?? record.part_serial_number ?? "—",
	);
}

export function getName(record: RecordItem) {
	return display(record.name ?? record.elector_name);
}

export function getPartNo(record: RecordItem, parts: Part[]) {
	return (
		parts.find((part) => part.part_id === Number(record.part_id))?.part_no ??
		record.part_no ??
		"—"
	);
}

export function hasPdf(record: RecordItem) {
	return record.pdf_id !== null && record.pdf_id !== undefined;
}

export function getPdfUrl(apiBaseUrl: string, section: Section, record: RecordItem) {
	return `${apiBaseUrl}/api/${section}/pdf/${String(record.pdf_id)}/file#page=${String(
		record.pdf_page,
	)}`;
}

/** Splits a raw "reason" string (comma/semicolon/pipe separated) into a clean list. */
export function splitReasons(raw: unknown): string[] {
	if (!hasValue(raw)) return [];
	return String(raw)
		.split(/[,;|]|(?:\s{2,}•\s*)/)
		.map((part) => part.trim())
		.filter(Boolean);
}

export function sectionKicker(section: Section) {
	return section === "draft"
		? "DRAFT ELECTOR"
		: section === "asdd"
			? "ASDD RECORD"
			: "DISCREPANCY RECORD";
}

export function sectionLabel(section: Section) {
	return section === "draft" ? "Draft" : section === "asdd" ? "ASDD" : "Discrepancy";
}

/**
 * Compact field set shown on the result card grid.
 * Name and Serial are rendered separately in the card header, so they are
 * intentionally excluded here.
 */
export function getCardFields(
	section: Section,
	record: RecordItem,
	parts: Part[],
): FieldRow[] {
	if (section === "draft") {
	return [
		{ label: "EPIC No", value: record.epic_no },
		{ label: "Part", value: getPartNo(record, parts) },
		{ label: "Relation Type", value: record.relation_type, icon: "relation" },
		{ label: "Relative Name", value: record.relative_name, icon: "relative" },
		{ label: "Gender", value: record.gender, icon: "gender" },
		{ label: "Age", value: record.age, icon: "age" },
		{
			label: "House No",
			value: record.house_number,
			icon: "house",
			wide: true,
		},
	];
}

	if (section === "asdd") {
	const reason = record.uncollectable_reason_raw;

	const rows: FieldRow[] = [
		{ label: "EPIC No", value: record.epic_no },
		{ label: "Part", value: getPartNo(record, parts) },
		{
			label: "Relation Type",
			value: record.relation_type,
			icon: "relation",
		},
		{
			label: "Relative Name",
			value: record.relative_name ?? record.relative_details_raw,
			icon: "relative",
		},
		{ label: "Age", value: record.age, icon: "age" },
		{
			label: "Reference EPIC",
			value: record.reference_epic,
			icon: "reference",
		},
	];

	if (hasValue(reason)) {
		rows.push({
			label: "Uncollectable Reason",
			value: reason,
			icon: "reason",
			wide: true,
		});
	}

	return rows;
}

	// discrepancy
	// discrepancy
const reasons = splitReasons(record.reason_raw);

const rows: FieldRow[] = [
	{ label: "EPIC No", value: record.epic_no },
	{ label: "Part", value: getPartNo(record, parts) },
	{ label: "Age", value: record.age, icon: "age" },
	{ label: "Gender", value: record.gender, icon: "gender" },
];

	rows.push(
		reasons.length > 1
	? {
			label: "Discrepancy Reasons",
			list: reasons,
			wide: true,
			icon: "reason",
		}
	: {
			label: "Discrepancy Reason",
			value: reasons[0],
			wide: true,
			icon: "reason",
		},
	);

	return rows;
}

/**
 * Full ordered field set shown in the Record Details view, including
 * Name and Serial Number which the card renders separately.
 */
export function getDetailFields(
	section: Section,
	record: RecordItem,
	parts: Part[],
): FieldRow[] {
	if (section === "draft") {
		return [
			{ label: "EPIC", value: record.epic_no },
			{ label: "Name", value: getName(record) },
			{ label: "Relation Type", value: record.relation_type },
			{ label: "Relative Name", value: record.relative_name },
			{ label: "House Number", value: record.house_number },
			{ label: "Age", value: record.age },
			{ label: "Gender", value: record.gender },
			{ label: "Part", value: getPartNo(record, parts) },
			{ label: "Serial Number", value: getSerial(record) },
		];
	}

	if (section === "asdd") {
		const reason = record.uncollectable_reason_raw;
		const rows: FieldRow[] = [
			{ label: "EPIC", value: record.epic_no },
			{ label: "Name", value: getName(record) },
			{ label: "Relation Type", value: record.relation_type },
			{
				label: "Relative Name",
				value: record.relative_name ?? record.relative_details_raw,
			},
			{ label: "Age", value: record.age },
			{ label: "Reference EPIC", value: record.reference_epic },
		];

		if (hasValue(reason)) {
			rows.push({ label: "Uncollectable Reason", value: reason });
		}

		rows.push(
			{ label: "Part", value: getPartNo(record, parts) },
			{ label: "Serial Number", value: getSerial(record) },
		);

		return rows;
	}

	// discrepancy
	const reasons = splitReasons(record.reason_raw);

	return [
		{ label: "EPIC", value: record.epic_no },
		{ label: "Name", value: getName(record) },
		{ label: "Age", value: record.age },
		{ label: "Gender", value: record.gender },
		{ label: "Part", value: getPartNo(record, parts) },
		{ label: "Serial Number", value: getSerial(record) },
		reasons.length > 1
			? { label: "Discrepancy Reasons", list: reasons }
			: { label: "Discrepancy Reason", value: reasons[0] },
	];
}
