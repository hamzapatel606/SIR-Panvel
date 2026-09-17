export default function Pagination({
	startIndex,
	endIndex,
	canGoPrevious,
	canGoNext,
	loading,
	onPrevious,
	onNext,
}: {
	startIndex: number;
	endIndex: number;
	canGoPrevious: boolean;
	canGoNext: boolean;
	loading: boolean;
	onPrevious: () => void;
	onNext: () => void;
}) {
	if (endIndex === 0) return null;

	return (
		<div className="pagination">
			<button
				type="button"
				className="pagination-button"
				onClick={onPrevious}
				disabled={!canGoPrevious || loading}
			>
				<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
					<path d="M10 3.5 5 8l5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
				Previous
			</button>

			<span className="pagination-status">
				Showing {startIndex}–{endIndex}
			</span>

			<button
				type="button"
				className="pagination-button"
				onClick={onNext}
				disabled={!canGoNext || loading}
			>
				Next
				<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
					<path d="M6 3.5 11 8l-5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			</button>
		</div>
	);
}
