export interface StatItem {
	label: string;
	value: string;
}

export default function StatsCards({ stats }: { stats: StatItem[] }) {
	return (
		<div className="stats-cards">
			{stats.map((stat, index) => (
				<div className="stat-card" key={index}>
					<strong>{stat.value}</strong>
					<span>{stat.label}</span>
				</div>
			))}
		</div>
	);
}
