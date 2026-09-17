import { useMemo, useState } from "react";
import type { Part } from "../services/api";

export default function PartSelector({
	id,
	parts,
	value,
	onChange,
}: {
	id: string;
	parts: Part[];
	value: string;
	onChange: (partNo: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const [filter, setFilter] = useState("");

	const totalRecords = useMemo(
		() => parts.reduce((sum, part) => sum + (part.record_count ?? 0), 0),
		[parts],
	);

	const filteredParts = useMemo(() => {
		const needle = filter.trim().toLowerCase();
		if (!needle) return parts;

		return parts.filter((part) => {
			return (
				String(part.part_no).includes(needle) ||
				(part.part_name ?? "").toLowerCase().includes(needle)
			);
		});
	}, [parts, filter]);

	const selectedPart = parts.find((part) => String(part.part_no) === value);

	const triggerLabel = selectedPart
		? `Part ${selectedPart.part_no}${selectedPart.part_name ? ` — ${selectedPart.part_name}` : ""}`
		: "All Parts";

	function choose(partNo: string) {
		onChange(partNo);
		setOpen(false);
		setFilter("");
	}

	return (
		<div className="part-selector">
			<button
				type="button"
				id={id}
				className="part-selector-trigger"
				aria-haspopup="listbox"
				aria-expanded={open}
				onClick={() => setOpen((current) => !current)}
			>
				<span>{triggerLabel}</span>
				<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
					<path
						d="M4 6l4 4 4-4"
						stroke="currentColor"
						strokeWidth="1.6"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</button>

			{open && (
				<>
					<div className="part-selector-backdrop" onClick={() => setOpen(false)} />
					<div className="part-selector-panel" role="listbox">
						<div className="part-selector-panel-header">
							<span>Select Part</span>
							<button
								type="button"
								className="part-selector-close"
								onClick={() => setOpen(false)}
								aria-label="Close part selector"
							>
								<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
									<path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
								</svg>
							</button>
						</div>

						<input
							type="search"
							className="part-selector-search"
							placeholder="Search part number..."
							value={filter}
							onChange={(event) => setFilter(event.target.value)}
							autoFocus
						/>

						<div className="part-selector-list">
							<button
								type="button"
								className={`part-selector-row${value === "" ? " is-selected" : ""}`}
								onClick={() => choose("")}
							>
								<span>{value === "" ? "✓ " : ""}All Parts</span>
								<span className="part-selector-count">{totalRecords.toLocaleString()} records</span>
							</button>

							{filteredParts.map((part) => (
								<button
									type="button"
									key={part.part_id}
									className={`part-selector-row${value === String(part.part_no) ? " is-selected" : ""}`}
									onClick={() => choose(String(part.part_no))}
								>
									<span>
										{value === String(part.part_no) ? "✓ " : ""}
										Part {part.part_no}
										{part.part_name ? ` — ${part.part_name}` : ""}
									</span>
									<span className="part-selector-count">
										{(part.record_count ?? 0).toLocaleString()} records
									</span>
								</button>
							))}

							{filteredParts.length === 0 && (
								<div className="part-selector-empty">No matching parts</div>
							)}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
