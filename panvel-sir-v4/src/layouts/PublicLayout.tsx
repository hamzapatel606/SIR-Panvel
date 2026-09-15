import { NavLink, Outlet } from "react-router-dom";

function PublicLayout() {
	return (
		<div className="app-shell">
			<header className="topbar">
				<div className="brand">
					<div className="brand-title">SIR Panvel</div>
					<div className="brand-subtitle">Special Intensive Revision</div>
				</div>
			</header>

			<nav className="navigation">
				<NavLink to="/" end>
					Home
				</NavLink>

				<NavLink to="/asdd">
					ASDD
				</NavLink>

				<NavLink to="/draft">
					Draft List
				</NavLink>

				<NavLink to="/discrepancy">
					Discrepancy List
				</NavLink>
			</nav>

			<main className="main-content">
				<Outlet />
			</main>

			<footer className="footer">
				<span>SIR Panvel</span>
			</footer>
		</div>
	);
}

export default PublicLayout;