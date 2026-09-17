import { useNavigate } from "react-router-dom";
import type { Part, Section } from "../services/api";
import {
	display,
	getCardFields,
	getPdfUrl,
	getSerial,
	getName,
	hasPdf,
	sectionKicker,
	type RecordItem,
} from "../utils/records";

const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";


function FieldIcon({ name }: { name: string }) {
	switch (name) {
		case "epic":
			return (
				<svg className="record-field-icon" viewBox="0 0 24 24" aria-hidden="true">
					<rect x="6" y="4" width="12" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
					<path d="M9 8h6M9 12h6M9 16h3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
				</svg>
			);

		case "relation":
			return (
				<svg
					className="record-field-icon"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<circle
						cx="9"
						cy="8"
						r="3"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.8"
					/>
					<path
						d="M3.5 19c0-3 2.4-5 5.5-5s5.5 2 5.5 5"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.8"
						strokeLinecap="round"
					/>
					<path
						d="M14 11h6M17 8v6"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.8"
						strokeLinecap="round"
					/>
				</svg>
			);

		case "relative":
			return (
				<svg className="record-field-icon" viewBox="0 0 24 24" aria-hidden="true">
					<circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
					<circle cx="17" cy="9" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
					<path
						d="M3.5 19c0-3 2.4-5 5.5-5s5.5 2 5.5 5M14 15c2.8-.1 5 1.5 5 4"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.8"
						strokeLinecap="round"
					/>
				</svg>
			);

		case "gender":
			return (
				<svg className="record-field-icon" viewBox="0 0 24 24" aria-hidden="true">
					<circle cx="10" cy="10" r="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
					<path
						d="M14 6l4-4M18 2h-3M18 2v3M10 15v7M7 19h6"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.8"
						strokeLinecap="round"
					/>
				</svg>
			);

		case "age":
			return (
				<svg className="record-field-icon" viewBox="0 0 24 24" aria-hidden="true">
					<rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
					<path d="M8 3v4M16 3v4M4 10h16M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
				</svg>
			);

		case "house":
			return (
				<svg className="record-field-icon" viewBox="0 0 24 24" aria-hidden="true">
					<path
						d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.8"
						strokeLinejoin="round"
					/>
					<path d="M9 21v-6h6v6" fill="none" stroke="currentColor" strokeWidth="1.8" />
				</svg>
			);

		case "reference":
			return (
				<svg
					className="record-field-icon"
					viewBox="0 0 24 24"
					fill="none"
					aria-hidden="true"
				>
					<rect
						x="4"
						y="5"
						width="16"
						height="14"
						rx="2"
						stroke="currentColor"
						strokeWidth="1.8"
					/>
					<path
						d="M8 9h8M8 13h5"
						stroke="currentColor"
						strokeWidth="1.8"
						strokeLinecap="round"
					/>
				</svg>
			);

		case "reason":
			return (
				<svg
					className="record-field-icon"
					viewBox="0 0 24 24"
					fill="none"
					aria-hidden="true"
				>
					<path
						d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"
						stroke="currentColor"
						strokeWidth="1.8"
						strokeLinejoin="round"
					/>
					<path
						d="M14 3.5V8h4M8 12h8M8 15.5h6"
						stroke="currentColor"
						strokeWidth="1.8"
						strokeLinecap="round"
					/>
				</svg>
			);

		default:
			return null;
	}
}

function EpicValue({ value }: { value: unknown }) {
	const epic = display(value);

	async function copyEpic(event: React.MouseEvent<HTMLButtonElement>) {
		event.stopPropagation();

		if (epic === "—") return;

		try {
			await navigator.clipboard.writeText(epic);
		} catch {
			console.error("Unable to copy EPIC number");
		}
	}

	return (
		<span className="record-field-value epic-value">
			{epic}

			{epic !== "—" && (
				<button
					type="button"
					className="epic-copy-button"
					onClick={copyEpic}
					title="Copy EPIC / Voter ID"
					aria-label="Copy EPIC / Voter ID"
				>
					<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<rect
							x="8"
							y="8"
							width="11"
							height="12"
							rx="2"
							stroke="currentColor"
							strokeWidth="1.8"
						/>
						<path
							d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h2"
							stroke="currentColor"
							strokeWidth="1.8"
							strokeLinecap="round"
						/>
					</svg>
				</button>
			)}
		</span>
	);
}

function CardField({
	label,
	value,
	wide,
	list,
	icon,
}: {
	label: string;
	value?: unknown;
	wide?: boolean;
	list?: string[];
	icon?: string;
}) {
	return (
		<div className={wide ? "record-field record-field-wide" : "record-field"}>
			{icon && <FieldIcon name={icon} />}

			<div className="record-field-content">
				<span className="record-field-label">{label}</span>

				{list ? (
					<ul className="record-field-list">
						{list.map((item, index) => (
							<li key={index}>{item}</li>
						))}
					</ul>
				) : label === "EPIC No" ? (
					<EpicValue value={value} />
				) : (
					<span className="record-field-value">{display(value)}</span>
				)}
			</div>
		</div>
	);
}

export default function RecordCard({
	section,
	record,
	parts,
	onOpenDetails,
}: {
	section: Section;
	record: RecordItem;
	parts: Part[];
	onOpenDetails: (record: RecordItem) => void;
}) {
	const recordHasPdf = hasPdf(record);
	const navigate = useNavigate();

	function crossSectionButton(target: Section) {
		const epic = display(record.epic_no);
		const label =
			target === "asdd"
				? "View in ASDD"
				: target === "draft"
					? "View in Draft"
					: "View in Discrepancy";

		return (
			<button
				key={target}
				type="button"
				className="card-action card-action-secondary"
				onClick={(event) => {
	event.stopPropagation();

	if (epic === "—") return;

	navigate(
		`/${target}?searchField=epic&query=${encodeURIComponent(epic)}`,
	);
}}
			>
				{label}
			</button>
		);
	}

	return (
		<article
			className={`record-card record-card-${section}`}
			role="button"
			tabIndex={0}
			onClick={() => onOpenDetails(record)}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					onOpenDetails(record);
				}
			}}
		>
			<div className="record-card-top">
				<div>
					<span className="record-card-kicker">{sectionKicker(section)}</span>
					<h2>{getName(record)}</h2>
				</div>

				<div
					className="record-serial"
					style={{
						textAlign: "center",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center"
					}}
				>
					<span>Sr No</span>
					<strong>{getSerial(record)}</strong>
				</div>
			</div>

			<div className="record-fields">
				{getCardFields(section, record, parts).map((field, index) => (
					<CardField key={index} {...field} />
				))}
			</div>

			<div className="card-actions">
				<button
					type="button"
					className={`card-action card-action-pdf${!recordHasPdf ? " is-unavailable" : ""}`}
					disabled={!recordHasPdf}
					onClick={(event) => {
						event.stopPropagation();
						if (recordHasPdf) {
							window.open(
								getPdfUrl(API_BASE_URL, section, record),
								"_blank",
								"noopener,noreferrer",
							);
						}
					}}
				>
					{recordHasPdf ? "View in PDF" : "PDF Not Available"}
				</button>

				<div className="card-action-row">
					{section !== "asdd" && crossSectionButton("asdd")}
					{section !== "draft" && crossSectionButton("draft")}
					{section !== "discrepancy" && crossSectionButton("discrepancy")}
				</div>
			</div>
		</article>
	);
}
