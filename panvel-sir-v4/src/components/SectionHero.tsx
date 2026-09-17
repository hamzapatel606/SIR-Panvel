import type { Section } from "../services/api";

export default function SectionHero({
	section,
	title,
	description,
}: {
	section: Section;
	title: string;
	description: string;
}) {
	return (
		<div className={`section-hero section-hero-${section}`}>
			<span className="page-eyebrow">SIR PANVEL · AC 188</span>
			<h1>{title}</h1>
			<p>{description}</p>
		</div>
	);
}
