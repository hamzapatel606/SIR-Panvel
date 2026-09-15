import { readFileSync } from "node:fs";
import { processXlsx } from "./pipeline";

const section = process.argv[2];
const filePath = process.argv[3];

if (
	section !== "draft" &&
	section !== "asdd" &&
	section !== "discrepancy"
) {
	throw new Error(
		"Usage: npx tsx src/import/test.ts <draft|asdd|discrepancy> <xlsx-file>",
	);
}

if (!filePath) {
	throw new Error(
		"Usage: npx tsx src/import/test.ts <draft|asdd|discrepancy> <xlsx-file>",
	);
}

const buffer = readFileSync(filePath);

const result = processXlsx(
	buffer.buffer.slice(
		buffer.byteOffset,
		buffer.byteOffset + buffer.byteLength,
	),
	section,
	100,
);

console.log("=== IMPORT TEST ===");
console.log("Section:", result.section);
console.log("Sheet:", result.sheetName);
console.log("Source rows:", result.rowCount);
console.log("Normalized records:", result.records.length);
console.log("Valid:", result.validation.valid);
console.log("Warnings:", result.validation.warnings.length);
console.log("Errors:", result.validation.errors.length);

if (result.validation.warnings.length > 0) {
	console.log("\n=== WARNINGS ===");

	for (const warning of result.validation.warnings.slice(0, 10)) {
		console.log(
			`Row ${warning.sourceRow}: ${warning.code} - ${warning.message}`,
		);
	}
}

if (result.validation.errors.length > 0) {
	console.log("\n=== ERRORS ===");

	for (const error of result.validation.errors.slice(0, 20)) {
		console.log(
			`Row ${error.sourceRow}: ${error.code} - ${error.message}`,
		);
	}
}

console.log("\n=== FIRST 3 RECORDS ===");
console.dir(result.records.slice(0, 3), {
	depth: null,
});