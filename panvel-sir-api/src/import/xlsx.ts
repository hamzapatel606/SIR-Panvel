import * as XLSX from "xlsx";

export type RawRow = Record<string, unknown>;

export interface ParsedWorkbook {
	rows: RawRow[];
	sheetName: string;
}

export function parseXlsx(buffer: ArrayBuffer): ParsedWorkbook {
	const workbook = XLSX.read(buffer, {
		type: "array",
		cellDates: false,
	});

	if (workbook.SheetNames.length === 0) {
		throw new Error("XLSX file contains no worksheets");
	}

	const sheetName = workbook.SheetNames[0];
	const sheet = workbook.Sheets[sheetName];

	if (!sheet) {
		throw new Error(`Worksheet "${sheetName}" could not be read`);
	}

	const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, {
		defval: null,
		raw: true,
	});

	return {
		rows,
		sheetName,
	};
}