import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import PublicLayout from "./layouts/PublicLayout";
import SectionPage from "./pages/SectionPage";
import HomePage from "./pages/HomePage";
import AdminPage from "./pages/AdminPage";

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
								title="ASDD List"
								description="Access and search voter information from the Accepted, Shifted, Deleted and Duplicated (ASDD) list for Panvel Assembly Constituency 188."
							/>
						}
					/>

					<Route
						path="/draft"
						element={
							<SectionPage
								section="draft"
								title="Draft List"
								description="Access and search voter information from the Draft List for Panvel Assembly Constituency 188."
							/>
						}
					/>

					<Route
						path="/discrepancy"
						element={
							<SectionPage
								section="discrepancy"
								title="Discrepancy List"
								description="View and search voter records with discrepancies identified during the SIR process for Panvel Assembly Constituency 188."
							/>
						}
					/>
				</Route>

				{/* Private — never linked from public UI */}
				<Route path="/admin" element={<AdminPage />} />

				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
