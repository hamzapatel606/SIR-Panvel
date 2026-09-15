import type {
    ImportValidationResult,
    NormalizedAsddRecord,
    NormalizedDiscrepancyRecord,
    NormalizedDraftRecord,
} from "./types";
import {
    getAsddReasonCode,
    getDiscrepancyReasonCode,
} from "./reasons";

import type { RawRow } from "./xlsx";

function text(value: unknown): string | null {
    if (value === null || value === undefined) {
        return null;
    }

    const result = String(value).trim();
    return result === "" ? null : result;
}

function optionalText(
    value: unknown,
    field: string,
    sourceRow: number,
    warnings: ImportValidationResult["warnings"],
): string | null {
    const result = text(value);
    if (result === null) {
        warnings.push({ sourceRow, code: "OPTIONAL_FIELD_EMPTY", message: `${field} is empty and will be stored as NULL` });
    }
    return result;
}

function requiredText(
    value: unknown,
    field: string,
    sourceRow: number,
    errors: ImportValidationResult["errors"],
): string | null {
    const result = text(value);

    if (!result) {
        errors.push({
            sourceRow,
            code: "REQUIRED_FIELD_MISSING",
            message: `${field} is required`,
        });

        return null;
    }

    return result;
}

function integer(
    value: unknown,
    field: string,
    sourceRow: number,
    errors: ImportValidationResult["errors"],
    warnings: ImportValidationResult["warnings"],
    required = false,
): number | null {
    if (value === null || value === undefined || String(value).trim() === "") {
        if (required) {
            errors.push({
                sourceRow,
                code: "REQUIRED_FIELD_MISSING",
                message: `${field} is required`,
            });
        } else {
            warnings.push({
                sourceRow,
                code: "OPTIONAL_FIELD_EMPTY",
                message: `${field} is empty and will be stored as NULL`,
            });
        }
        return null;
    }

    const numberValue = Number(value);

    if (!Number.isInteger(numberValue)) {
        errors.push({
            sourceRow,
            code: "INVALID_INTEGER",
            message: `${field} must be an integer`,
        });
        return null;
    }

    return numberValue;
}

export function normalizeDraftRows(
    rows: RawRow[],
): {
    records: NormalizedDraftRecord[];
    result: ImportValidationResult;
} {
    const records: NormalizedDraftRecord[] = [];
    const result: ImportValidationResult = {
        valid: true,
        warnings: [],
        errors: [],
    };

    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const sourceRow = index + 2;
        const partNo = integer(
            row["Part No"],
            "Part No",
            sourceRow,
            result.errors,
            result.warnings,
            true,
        );

        const srNo = integer(
            row["Sr No"],
            "Sr No",
            sourceRow,
            result.errors,
            result.warnings,
            true,
        );

        const epicNo = requiredText(
            row["EPIC / Voter ID"],
            "EPIC / Voter ID",
            sourceRow,
            result.errors,
        );

        const name = requiredText(
            row["Name"],
            "Name",
            sourceRow,
            result.errors,
        );

        const age = integer(
            row["Age"],
            "Age",
            sourceRow,
            result.errors,
                result.warnings,
            );

        const pdfPage = integer(
            row["PDF Page"],
            "PDF Page",
            sourceRow,
            result.errors,
            result.warnings,
            true,
        );

        if (
            partNo === null ||
            srNo === null ||
            epicNo === null ||
            name === null ||
            pdfPage === null
        ) {
            continue;
        }

        records.push({
            sourceRow,
            partNo,

            srNo,
            epicNo,
            name,

            relationType: optionalText(row["Relation Type"], "Relation Type", sourceRow, result.warnings),
            relativeName: optionalText(row["Relative Name"], "Relative Name", sourceRow, result.warnings),
            houseNumber: optionalText(row["House Number"], "House Number", sourceRow, result.warnings),

            age,
            gender: optionalText(row["Gender"], "Gender", sourceRow, result.warnings),

            pdfPage,
            pdfBox: optionalText(row["PDF Box"], "PDF Box", sourceRow, result.warnings),
            gridRow: integer(
                row["Grid Row"],
                "Grid Row",
                sourceRow,
                result.errors,
                result.warnings,
            ),
            gridCol: integer(
                row["Grid Col"],
                "Grid Col",
                sourceRow,
                result.errors,
                result.warnings,
            ),
        });
    }

    result.valid = result.errors.length === 0;

    return {
        records,
        result,
    };
}
export function normalizeAsddRows(
    rows: RawRow[],
): {
    records: NormalizedAsddRecord[];
    result: ImportValidationResult;
} {
    const records: NormalizedAsddRecord[] = [];
    const result: ImportValidationResult = {
        valid: true,
        warnings: [],
        errors: [],
    };

    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const sourceRow = index + 2;
        const partNo = integer(
            row["Part No"],
            "Part No",
            sourceRow,
            result.errors,
            result.warnings,
            true,
        );

        const serialNo = integer(
            row["Serial No"],
            "Serial No",
            sourceRow,
            result.errors,
            result.warnings,
            true,
        );

        const epicNo = requiredText(
            row["EPIC Number"],
            "EPIC Number",
            sourceRow,
            result.errors,
        );

        const name = requiredText(
            row["Elector Name"],
            "Elector Name",
            sourceRow,
            result.errors,
        );

        const reasonRaw = requiredText(
            row["Uncollectable Reason"],
            "Uncollectable Reason",
            sourceRow,
            result.errors,
        );

        const pdfPage = integer(
            row["PDF Page"],
            "PDF Page",
            sourceRow,
            result.errors,
            result.warnings,
            true,
        );

        const age = integer(
            row["DOB/Age"],
            "DOB/Age",
            sourceRow,
            result.errors,
                result.warnings,
            );

        if (
            partNo === null ||
            serialNo === null ||
            epicNo === null ||
            name === null ||
            reasonRaw === null ||
            pdfPage === null
        ) {
            continue;
        }

        const relativeDetailsRaw = optionalText(row["Relative Details"], "Relative Details", sourceRow, result.warnings);

        let relativeName: string | null = null;
        let relationType: string | null = null;

        if (relativeDetailsRaw) {
            const match = relativeDetailsRaw.match(/^(.+?)\s*\(([^()]+)\)\s*$/);

            if (match) {
                relativeName = match[1].trim() || null;
                relationType = match[2].trim() || null;
            } else {
                result.warnings.push({
                    sourceRow,
                    code: "RELATIVE_DETAILS_UNPARSED",
                    message:
                        "Relative Details could not be confidently separated into name and relation",
                });
            }
        }

        let referenceEpic: string | null = null;

        const referenceMatch = reasonRaw.match(
            /^Already enrolled\s*\(([^()]+)\)\s*$/i,
        );

        if (referenceMatch) {
            referenceEpic = referenceMatch[1].trim() || null;
        }

        const baseReason = reasonRaw
            .replace(/\s*\([^()]+\)\s*$/, "")
            .trim();

        const uncollectableReasonCode =
            getAsddReasonCode(baseReason) ?? "UNKNOWN";

        records.push({
            sourceRow,
            partNo,

            serialNo,
            epicNo,
            name,

            relativeDetailsRaw,
            relativeName,
            relationType,

            age,
            referenceEpic,

            uncollectableReasonRaw: reasonRaw,
            uncollectableReasonCode,

            pdfPage,
            pdfBox: optionalText(row["PDF Box"], "PDF Box", sourceRow, result.warnings),
        });
    }

    result.valid = result.errors.length === 0;

    return {
        records,
        result,
    };
}
export function normalizeDiscrepancyRows(
    rows: RawRow[],
): {
    records: NormalizedDiscrepancyRecord[];
    result: ImportValidationResult;
} {
    const records: NormalizedDiscrepancyRecord[] = [];
    const result: ImportValidationResult = {
        valid: true,
        warnings: [],
        errors: [],
    };

    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const sourceRow = index + 2;
        const partNo = integer(
            row["Part No"],
            "Part No",
            sourceRow,
            result.errors,
            result.warnings,
            true,
        );

        const partSerialNumber = integer(
            row["Part Serial Number"],
            "Part Serial Number",
            sourceRow,
            result.errors,
            result.warnings,
            true,
        );

        const epicNo = requiredText(
            row["EPIC Number"],
            "EPIC Number",
            sourceRow,
            result.errors,
        );

        const name = requiredText(
            row["Elector Name"],
            "Elector Name",
            sourceRow,
            result.errors,
        );

        const reasonRaw = requiredText(
            row["Reason for discrepancy"],
            "Reason for discrepancy",
            sourceRow,
            result.errors,
        );

        const age = integer(
            row["Age"],
            "Age",
            sourceRow,
            result.errors,
                result.warnings,
            );

        const pdfPage = integer(
            row["PDF Page"],
            "PDF Page",
            sourceRow,
            result.errors,
            result.warnings,
            true,
        );

        if (
            partNo === null ||
            partSerialNumber === null ||
            epicNo === null ||
            name === null ||
            reasonRaw === null ||
            pdfPage === null
        ) {
            continue;
        }

        const reasonCodes = reasonRaw
            .split(",")
            .map((reason) => reason.trim())
            .filter(Boolean)
            .map((reason) => getDiscrepancyReasonCode(reason) ?? "UNKNOWN");

        records.push({
            sourceRow,
            partNo,

            partSerialNumber,
            epicNo,
            name,

            age,
            gender: optionalText(row["Gender"], "Gender", sourceRow, result.warnings),

            reasonRaw,
            reasonCodes,

            pdfPage,
            pdfBox: optionalText(row["PDF Box"], "PDF Box", sourceRow, result.warnings),
        });
    }

    result.valid = result.errors.length === 0;

    return {
        records,
        result,
    };
}

