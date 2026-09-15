import { useEffect, useState } from "react";
import {
	activateAdminDataset,
	createAdminDataset,
	getAdminDatasets,
	getVersion,
	importAdminWorkbook,
	importAdminPdfs,
	type AdminDataset,
	type DatasetVersion,
	type ImportResult,
	type Section,
} from "../services/api";

const ADMIN_TOKEN_KEY = "sir_panvel_admin_token";

const sections: {
	key: Section;
	title: string;
	description: string;
}[] = [
	{ key: "asdd", title: "ASDD", description: "Absent, Shifted, Dead & Duplicate voters" },
	{ key: "draft", title: "Draft List", description: "Draft electoral roll" },
	{ key: "discrepancy", title: "Discrepancy List", description: "Electoral roll discrepancies" },
];

function AdminPage() {
	const [token, setToken] = useState(() => sessionStorage.getItem(ADMIN_TOKEN_KEY) ?? "");
	const [authenticated, setAuthenticated] = useState(() => Boolean(sessionStorage.getItem(ADMIN_TOKEN_KEY)));
	const [tokenInput, setTokenInput] = useState("");
	const [loginError, setLoginError] = useState("");
	const [versions, setVersions] = useState<Record<Section, DatasetVersion | null>>({ asdd: null, draft: null, discrepancy: null });
	const [datasets, setDatasets] = useState<Record<Section, AdminDataset[]>>({ asdd: [], draft: [], discrepancy: [] });
	const [loading, setLoading] = useState(false);
	const [selectedSection, setSelectedSection] = useState<Section | null>(null);
	const [versionCode, setVersionCode] = useState("");
	const [versionName, setVersionName] = useState("");
	const [formError, setFormError] = useState("");
	const [formMessage, setFormMessage] = useState("");
	const [saving, setSaving] = useState(false);
	const [activatingId, setActivatingId] = useState<number | null>(null);
	const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
	const [xlsxFile, setXlsxFile] = useState<File | null>(null);
	const [importing, setImporting] = useState(false);
	const [importResult, setImportResult] = useState<ImportResult | null>(null);
	const [pdfFiles, setPdfFiles] = useState<Array<{ file: File; partNo: string; pageCount: string }>>([]);
	const [pdfImporting, setPdfImporting] = useState(false);
	const [pdfImportResult, setPdfImportResult] = useState<{ count: number; results: unknown[] } | null>(null);
	const selectedDataset = selectedSection && selectedDatasetId
		? datasets[selectedSection].find((item) => item.dataset_id === selectedDatasetId) ?? null
		: null;

	async function loadAdminData(adminToken: string) {
		setLoading(true);
		try {
			const results = await Promise.all(
				sections.map(async ({ key }) => {
					const [activeResult, datasetResult] = await Promise.all([
						getVersion(key, adminToken).catch(() => null),
						getAdminDatasets(key, adminToken),
					]);
					return { section: key, version: activeResult?.version ?? null, datasets: datasetResult.datasets };
				}),
			);
			setVersions((current) => {
				const next = { ...current };
				for (const result of results) next[result.section] = result.version;
				return next;
			});
			setDatasets((current) => {
				const next = { ...current };
				for (const result of results) next[result.section] = result.datasets;
				return next;
			});
		} catch (error) {
			console.error("Admin dataset loading failed:", error);
			setFormError(error instanceof Error ? error.message : "Unable to load Admin datasets.");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		if (!authenticated || !token) return;
		void loadAdminData(token);
	}, [authenticated, token]);

	function handleLogin(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const value = tokenInput.trim();
		if (!value) {
			setLoginError("Enter the Admin Token.");
			return;
		}
		sessionStorage.setItem(ADMIN_TOKEN_KEY, value);
		setToken(value);
		setAuthenticated(true);
		setLoginError("");
	}

	function handleLogout() {
		sessionStorage.removeItem(ADMIN_TOKEN_KEY);
		setToken("");
		setAuthenticated(false);
		setTokenInput("");
		setSelectedSection(null);
		setSelectedDatasetId(null);
		setXlsxFile(null);
		setImportResult(null);
		setPdfFiles([]);
		setPdfImportResult(null);
	}

	function openManager(section: Section) {
		setSelectedSection(section);
		setVersionCode("");
		setVersionName("");
		setFormError("");
		setFormMessage("");
		setSelectedDatasetId(null);
		setXlsxFile(null);
		setImportResult(null);
		setPdfFiles([]);
		setPdfImportResult(null);
	}

	async function handleCreateVersion(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!selectedSection) return;
		setFormError("");
		setFormMessage("");
		if (!versionCode.trim() || !versionName.trim()) {
			setFormError("Version Code and Version Name are required.");
			return;
		}
		setSaving(true);
		try {
			await createAdminDataset(selectedSection, token, versionCode.trim(), versionName.trim());
			setFormMessage("Version created as ARCHIVED. It is not public yet.");
			setVersionCode("");
			setVersionName("");
			await loadAdminData(token);
		} catch (error) {
			setFormError(error instanceof Error ? error.message : "Unable to create version.");
		} finally {
			setSaving(false);
		}
	}

	async function handleActivate(datasetId: number) {
		if (!selectedSection) return;
		const dataset = datasets[selectedSection].find((item) => item.dataset_id === datasetId);
		if (!dataset) return;
		if (!window.confirm(`Activate ${dataset.version_code}? This will archive the current active version for ${selectedSection.toUpperCase()}.`)) return;
		setActivatingId(datasetId);
		setFormError("");
		setFormMessage("");
		try {
			await activateAdminDataset(selectedSection, token, datasetId);
			setFormMessage(`${dataset.version_code} is now ACTIVE.`);
			await loadAdminData(token);
		} catch (error) {
			setFormError(error instanceof Error ? error.message : "Unable to activate version.");
		} finally {
			setActivatingId(null);
		}
	}

	async function handleImport(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!selectedSection || !selectedDatasetId || !xlsxFile) {
			setFormError("Select a dataset and an XLSX file.");
			return;
		}
		setFormError("");
		setFormMessage("");
		setImportResult(null);
		setImporting(true);
		try {
			const result = await importAdminWorkbook(selectedSection, token, selectedDatasetId, xlsxFile);
			setImportResult(result);
			setFormMessage("XLSX import completed successfully.");
			setXlsxFile(null);
			await loadAdminData(token);
		} catch (error) {
			setFormError(error instanceof Error ? error.message : "Unable to import XLSX data.");
		} finally {
			setImporting(false);
		}
	}

	function handlePdfSelection(event: React.ChangeEvent<HTMLInputElement>) {
		const selected = Array.from(event.target.files ?? []);
		const next = selected.map((file) => {
			const match = file.name.match(/(?:^|[^0-9])part[_ -]?(\d+)(?:[^0-9]|$)/i);
			return { file, partNo: match ? match[1] : "", pageCount: "" };
		});
		setPdfFiles(next);
		setPdfImportResult(null);
		setFormError("");
	}

	function updatePdfPartNo(index: number, value: string) {
		setPdfFiles((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, partNo: value.replace(/\D/g, "") } : item));
	}

	function updatePdfPageCount(index: number, value: string) {
		setPdfFiles((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, pageCount: value.replace(/\D/g, "") } : item));
	}

	async function handlePdfImport(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!selectedSection || !selectedDatasetId || !pdfFiles.length) {
			setFormError("Select a dataset and at least one PDF file.");
			return;
		}
		const items = pdfFiles.map((item) => ({ file: item.file, partNo: Number(item.partNo), pageCount: item.pageCount.trim() ? Number(item.pageCount) : null }));
		if (items.some((item) => !Number.isInteger(item.partNo) || item.partNo < 1)) {
			setFormError("Every PDF needs a valid Part Number. It can be inferred from the filename or entered manually.");
			return;
		}
		if (items.some((item) => item.pageCount !== null && (!Number.isInteger(item.pageCount) || item.pageCount < 1))) {
			setFormError("Page Count must be a positive integer when supplied. Leave it blank if unknown.");
			return;
		}
		setFormError("");
		setFormMessage("");
		setPdfImportResult(null);
		setPdfImporting(true);
		try {
			const result = await importAdminPdfs(selectedSection, token, selectedDatasetId, items);
			setPdfImportResult(result);
			setFormMessage(`${result.count} PDF${result.count === 1 ? "" : "s"} uploaded successfully.`);
			setPdfFiles([]);
			await loadAdminData(token);
		} catch (error) {
			setFormError(error instanceof Error ? error.message : "Unable to upload PDFs.");
		} finally {
			setPdfImporting(false);
		}
	}


	if (!authenticated) {
		return (
			<main className="admin-page">
				<div className="admin-login-card">
					<div className="admin-eyebrow">SIR PANVEL</div>
					<h1>Admin Login</h1>
					<p>Enter the Admin Token to access dataset and import management.</p>
					<form onSubmit={handleLogin}>
						<label htmlFor="admin-token">Admin Token</label>
						<input id="admin-token" type="password" value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} placeholder="Enter Admin Token" autoComplete="off" />
						{loginError && <div className="admin-error">{loginError}</div>}
						<button type="submit" className="admin-primary-button">Continue</button>
					</form>
				</div>
			</main>
		);
	}

	return (
		<main className="admin-page">
			<div className="admin-container">
				<header className="admin-header">
					<div><div className="admin-eyebrow">SIR PANVEL</div><h1>Admin Dashboard</h1><p>Manage datasets, imports and publication status.</p></div>
					<button type="button" className="admin-logout-button" onClick={handleLogout}>Sign Out</button>
				</header>

				<section className="admin-section">
					<div className="admin-section-heading"><div><h2>Dataset Overview</h2><p>Current active dataset for each electoral section.</p></div>{loading && <span className="admin-loading">Loading…</span>}</div>
					<div className="admin-section-grid">
						{sections.map((section) => {
							const version = versions[section.key];
							return <article className="admin-dataset-card" key={section.key}>
								<div className="admin-card-top"><div><span className="admin-card-label">SECTION</span><h3>{section.title}</h3></div><span className={`admin-status ${version ? "admin-status-active" : "admin-status-none"}`}>{version ? "ACTIVE" : "NO ACTIVE VERSION"}</span></div>
								<p>{section.description}</p>
								<div className="admin-version-box"><span>Current Version</span><strong>{version ? version.version_code : "—"}</strong>{version && <small>{version.version_name}</small>}</div>
								<button type="button" className="admin-secondary-button" onClick={() => openManager(section.key)}>Manage {section.title}</button>
							</article>;
						})}
					</div>
				</section>

				{selectedSection && <section className="admin-manager">
					<div className="admin-manager-header"><div><div className="admin-eyebrow">DATASET MANAGEMENT</div><h2>{sections.find((item) => item.key === selectedSection)?.title}</h2><p>Create versions, prepare imports, and publish only when ready.</p></div><button type="button" className="admin-logout-button" onClick={() => setSelectedSection(null)}>Close</button></div>

					<div className="admin-manager-grid">
						<div className="admin-manager-panel">
							<h3>Create New Version</h3>
							<p>New versions start as ARCHIVED and are not visible publicly.</p>
							<form onSubmit={handleCreateVersion} className="admin-version-form">
								<label htmlFor="version-code">Version Code</label><input id="version-code" value={versionCode} onChange={(event) => setVersionCode(event.target.value)} placeholder="e.g. DRAFT-2026" autoComplete="off" />
								<label htmlFor="version-name">Version Name</label><input id="version-name" value={versionName} onChange={(event) => setVersionName(event.target.value)} placeholder="e.g. Draft Roll 2026" autoComplete="off" />
								{formError && <div className="admin-error">{formError}</div>}{formMessage && <div className="admin-success">{formMessage}</div>}
								<button type="submit" className="admin-primary-button" disabled={saving}>{saving ? "Creating…" : "Create Version"}</button>
							</form>
						</div>

						<div className="admin-manager-panel">
							<h3>Existing Versions</h3><p>Only ACTIVE is public. ARCHIVED versions remain available for preparation.</p>
							<div className="admin-dataset-list">
								{datasets[selectedSection].length === 0 && <div className="admin-empty">No versions created yet.</div>}
								{datasets[selectedSection].map((dataset) => <div className="admin-dataset-row" key={dataset.dataset_id}>
									<div><strong>{dataset.version_code}</strong><span>{dataset.version_name}</span></div>
									<div className="admin-row-actions"><span className={`admin-status ${dataset.status === "ACTIVE" ? "admin-status-active" : "admin-status-none"}`}>{dataset.status}</span><button type="button" className="admin-small-button" onClick={() => setSelectedDatasetId(dataset.dataset_id)}>{dataset.status === "ACTIVE" ? "Add Excel Data" : "Prepare Import"}</button>{dataset.status === "ARCHIVED" && <button type="button" className="admin-small-button" disabled={activatingId === dataset.dataset_id} onClick={() => void handleActivate(dataset.dataset_id)}>{activatingId === dataset.dataset_id ? "Activating…" : "Activate"}</button>}</div>
								</div>)}
							</div>
						</div>
					</div>

					<div className="admin-import-panel">
						<div className="admin-import-header"><div><div className="admin-eyebrow">EXCEL IMPORT</div><h3>{selectedDataset?.status === "ACTIVE" ? "Add XLSX Data" : "Prepare XLSX Data"}</h3><p>{selectedDataset?.status === "ACTIVE" ? "Add new Parts to the current ACTIVE dataset. Existing READY Parts cannot be overwritten." : "Import into an ARCHIVED dataset. The dataset stays private until you activate it."}</p></div>{selectedDataset && <span className={`admin-import-dataset ${selectedDataset.status === "ACTIVE" ? "admin-import-dataset-live" : ""}`}>{selectedDataset.version_code}</span>}</div>
						{selectedDatasetId ? <form className="admin-import-form" onSubmit={handleImport}>
							<label htmlFor="xlsx-file">XLSX File</label>
							<input id="xlsx-file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => setXlsxFile(event.target.files?.[0] ?? null)} />
							<div className="admin-import-actions"><button type="submit" className="admin-primary-button" disabled={importing || !xlsxFile}>{importing ? "Importing…" : "Validate & Import"}</button><button type="button" className="admin-small-button" onClick={() => { setSelectedDatasetId(null); setXlsxFile(null); setImportResult(null); setPdfFiles([]); setPdfImportResult(null); }}>Clear</button></div>
						</form> : <div className="admin-import-empty">Choose <strong>Add Excel Data</strong> on the ACTIVE version or <strong>Prepare Import</strong> on an ARCHIVED version to select an XLSX file.</div>}

						{importResult && <div className="admin-import-result"><strong>Import complete</strong><div className="admin-result-grid"><span>Parts processed<strong>{importResult.partsProcessed ?? importResult.parts?.length ?? "—"}</strong></span><span>Records imported<strong>{importResult.recordCount ?? importResult.totalRecords ?? "—"}</strong></span></div><details><summary>Technical result</summary><pre>{JSON.stringify(importResult, null, 2)}</pre></details></div>}
					</div>

					<div className="admin-import-panel admin-pdf-panel">
						<div className="admin-import-header"><div><div className="admin-eyebrow">PDF IMPORT</div><h3>Upload Part PDFs</h3><p>Upload up to 20 PDFs at once. Page count is optional and is left unknown when not supplied. PDFs can be uploaded before or after Excel data.</p></div>{selectedDataset && <span className={`admin-import-dataset ${selectedDataset.status === "ACTIVE" ? "admin-import-dataset-live" : ""}`}>{selectedDataset.version_code}</span>}</div>
						{selectedDatasetId ? <form className="admin-pdf-form" onSubmit={handlePdfImport}>
							<label htmlFor="pdf-files">PDF Files</label>
							<input id="pdf-files" type="file" accept="application/pdf,.pdf" multiple onChange={handlePdfSelection} />
							{pdfFiles.length > 0 && <div className="admin-pdf-file-list">
								{pdfFiles.map((item, index) => <div className="admin-pdf-file-row" key={`${item.file.name}-${index}`}><div><strong>{item.file.name}</strong><span>{(item.file.size / (1024 * 1024)).toFixed(1)} MB</span></div><div className="admin-pdf-fields"><label>Part No<input value={item.partNo} inputMode="numeric" onChange={(event) => updatePdfPartNo(index, event.target.value)} placeholder="29" /></label><label>Page Count<input value={item.pageCount} inputMode="numeric" onChange={(event) => updatePdfPageCount(index, event.target.value)} placeholder="80" aria-label={`Page count for ${item.file.name}`} /></label></div></div>)}
							</div>}
							<div className="admin-import-actions"><button type="submit" className="admin-primary-button" disabled={pdfImporting || !pdfFiles.length}>{pdfImporting ? "Uploading…" : "Upload PDFs"}</button><button type="button" className="admin-small-button" onClick={() => { setPdfFiles([]); setPdfImportResult(null); }}>Clear</button></div>
						</form> : <div className="admin-import-empty">Choose <strong>Add Excel Data</strong> or <strong>Prepare Import</strong> above to select a dataset.</div>}
						{pdfImportResult && <div className="admin-import-result"><strong>PDF upload complete</strong><div className="admin-result-grid"><span>PDFs uploaded<strong>{pdfImportResult.count}</strong></span><span>Parts handled<strong>{pdfImportResult.results.length}</strong></span></div><details><summary>Technical result</summary><pre>{JSON.stringify(pdfImportResult, null, 2)}</pre></details></div>}
					</div>
				</section>}
			</div>
		</main>
	);
}

export default AdminPage;
