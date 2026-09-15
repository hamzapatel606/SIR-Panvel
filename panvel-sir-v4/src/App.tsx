import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import PublicLayout from "./layouts/PublicLayout";
import SectionPage from "./pages/SectionPage";
import AdminPage from "./pages/AdminPage";

function HomePage() {
	return (
		<div className="page-header">
			<h1>Welcome to SIR Panvel</h1>
			<p>Special Intensive Revision</p>
		</div>
	);
}

function App() {
	return (
		<BrowserRouter>
			<Routes>
				{/* Public */}
				<Route element={<PublicLayout />}>
					<Route path="/" element={<HomePage />} />

					<Route
						path="/asdd"
						element={
							<SectionPage
								section="asdd"
								title="ASDD"
								description="Absent, Shifted, Dead & Duplicate voters"
							/>
						}
					/>

					<Route
						path="/draft"
						element={
							<SectionPage
								section="draft"
								title="Draft List"
								description="Search and browse the Draft Electoral Roll"
							/>
						}
					/>

					<Route
						path="/discrepancy"
						element={
							<SectionPage
								section="discrepancy"
								title="Discrepancy List"
								description="Review electoral roll discrepancies"
							/>
						}
					/>
				</Route>

				{/* Private — never linked from public UI */}
				<Route path="/admin" element={<AdminPage />} />

				<Route
					path="*"
					element={<Navigate to="/" replace />}
				/>
			</Routes>
		</BrowserRouter>
	);
}

export default App;