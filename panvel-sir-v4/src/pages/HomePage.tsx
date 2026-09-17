import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getParts, type Section } from "../services/api";
import StatsCards from "../components/StatsCards";

const LISTS: {
	section: Section;
	to: string;
	title: string;
	description: string;
	theme: string;
}[] = [
	{
		section: "draft",
		to: "/draft",
		title: "Draft List",
		description: "Search the SIR Panvel Draft List ",
		theme: "draft",
	},
	{
		section: "asdd",
		to: "/asdd",
		title: "ASDD List",
		description: "Search Absent, Shifted, Dead & Duplicate SIR records.",
		theme: "asdd",
	},
	{
		section: "discrepancy",
		to: "/discrepancy",
		title: "Discrepancy List",
		description: "Search and review Discrepancy records",
		theme: "discrepancy",
	},
];

const HOW_TO_STEPS = [
	{
		title: "Choose a list",
		description: "Select Draft, ASDD or Discrepancy List depending on the information you need.",
	},
	{
		title: "Search or select a Part",
		description: "Search by EPIC number, name or other details, and optionally narrow the results to a specific Part.",
	},
	{
		title: "Open the record",
		description: "Tap a result card to view full details, or open the scanned PDF page for that voter.",
	},
];

export default function HomePage() {
	const [totalParts, setTotalParts] = useState<number | null>(null);
	const [totalRecords, setTotalRecords] = useState<number | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function loadStats() {
			try {
				const result = await getParts("draft");
				if (cancelled) return;
				setTotalParts(result.parts.length);
				setTotalRecords(result.parts.reduce((sum, part) => sum + (part.record_count ?? 0), 0));
			} catch {
				// Stats are a nice-to-have on the home page; leave them blank on failure.
			}
		}

		loadStats();
		return () => {
			cancelled = true;
		};
	}, []);

	const stats = [
		{ label: "Total Parts", value: totalParts !== null ? totalParts.toLocaleString() : "—" },
		{ label: "Total Records", value: totalRecords !== null ? totalRecords.toLocaleString() : "—" },
		{ label: "Election Year", value: "2026" },
		{ label: "Assembly Constituency", value: "Panvel · 188" },
	];

	return (
		<div className="home-page">
			<div className="home-hero">
				<span className="page-eyebrow">PANVEL SIR 2026</span>
				<h1>Voter List Search Portal</h1>
				<p className="home-hero-locale">Maharashtra · Raigad · Panvel · Assembly Constituency 188</p>
				<p className="home-hero-copy">
					Search and access voter information from the ASDD, Draft and Discrepancy lists for Panvel.
				</p>
			</div>

			<div className="home-section-header">
				<h2>Select a List</h2>
				<p>Choose the voter information list you want to search.</p>
			</div>

			<div className="home-list-cards">
				{LISTS.map((list) => (
					<Link key={list.section} to={list.to} className={`home-list-card home-list-card-${list.theme}`}>
						<span className="record-card-kicker">
							{list.section === "draft" ? "DRAFT" : list.section === "asdd" ? "ASDD" : "DISCREPANCY"}
						</span>
						<h3>{list.title}</h3>
						<p>{list.description}</p>
						<span className="home-list-card-cta">
							Search {list.title}
							<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
								<path d="M6 3.5 11 8l-5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</span>
					</Link>
				))}
			</div>

			<StatsCards stats={stats} />

			<div className="home-section-header">
				<h2>How to Use</h2>
				<p>A quick guide to finding your voter record.</p>
			</div>

			<div className="how-to-steps">
				{HOW_TO_STEPS.map((step, index) => (
					<div className="how-to-step" key={step.title}>
						<span className="how-to-step-number">{index + 1}</span>
						<div>
							<h3>{step.title}</h3>
							<p>{step.description}</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
