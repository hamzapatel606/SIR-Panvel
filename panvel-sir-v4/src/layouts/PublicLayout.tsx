import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

function PublicLayout() {
	const [navOpen, setNavOpen] = useState(false);
	const location = useLocation();

	useEffect(() => {
		setNavOpen(false);
	}, [location.pathname]);

	return (
		<div className="app-shell">
			<header className="topbar">
				<div className="brand">
					<div className="brand-mark" aria-hidden="true">
						<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path
								d="M4 12.5 9.5 18 20 6"
								stroke="currentColor"
								strokeWidth="2.2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</div>
					<div className="brand-text">
						<div className="brand-title">SIR Panvel</div>
						<div className="brand-subtitle">Special Intensive Revision</div>
					</div>

					<button
						type="button"
						className="nav-toggle"
						aria-label={navOpen ? "Close menu" : "Open menu"}
						aria-expanded={navOpen}
						onClick={() => setNavOpen((current) => !current)}
					>
						{navOpen ? (
							<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
								<path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
							</svg>
						) : (
							<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
								<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
							</svg>
						)}
					</button>
				</div>
			</header>

			<nav className={`navigation${navOpen ? " navigation-open" : ""}`}>
				<NavLink to="/" end>
					<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
						<path
							d="M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h3v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20h3a1 1 0 0 0 1-1v-9"
							stroke="currentColor"
							strokeWidth="1.8"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
					Home
				</NavLink>

				<NavLink to="/asdd">
					<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
						<circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
						<path
							d="M3.5 20v-1c0-2.8 2.5-5 5.5-5s5.5 2.2 5.5 5v1M16 8.5l4 4m0-4-4 4"
							stroke="currentColor"
							strokeWidth="1.8"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
					ASDD
				</NavLink>

				<NavLink to="/draft">
					<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
						<path
							d="M7 3.5h7l4 4V19a1.2 1.2 0 0 1-1.2 1.2H7A1.2 1.2 0 0 1 5.8 19V4.7A1.2 1.2 0 0 1 7 3.5Z"
							stroke="currentColor"
							strokeWidth="1.8"
							strokeLinejoin="round"
						/>
						<path d="M9 12h6M9 15.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
					</svg>
					Draft List
				</NavLink>

				<NavLink to="/discrepancy">
					<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
						<path
							d="M12 4 21 19H3L12 4Z"
							stroke="currentColor"
							strokeWidth="1.8"
							strokeLinejoin="round"
						/>
						<path d="M12 10v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
						<circle cx="12" cy="16.5" r="0.9" fill="currentColor" stroke="none" />
					</svg>
					Discrepancy List
				</NavLink>
			</nav>

			<main className="main-content">
				<Outlet />
			</main>

			<footer className="footer">
				<span>NOTE : This is a unofficial lookup tool for the SIR Panvel · Special Intensive Revision 2026 · Panvel Assembly Constituency 188</span>
			</footer>
		</div>
	);
}

export default PublicLayout;
