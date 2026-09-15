export const ASDD_REASON_CODES = {
	"Already enrolled": "ALREADY_ENROLLED",
	"Death": "DEATH",
	"EF Refused": "EF_REFUSED",
	"Permanently Shifted": "PERMANENTLY_SHIFTED",
	"Untraceable/Absent": "UNTRACEABLE_ABSENT",
} as const;

export const DISCREPANCY_REASON_CODES = {
	"Grandparent Age difference <40":
		"GRANDPARENT_AGE_DIFFERENCE_LT_40",

	"Parent Age Difference <15":
		"PARENT_AGE_DIFFERENCE_LT_15",

	"Parent Age difference >50":
		"PARENT_AGE_DIFFERENCE_GT_50",

	"Parent Name Mismatch":
		"PARENT_NAME_MISMATCH",

	"Progeny >= 6":
		"PROGENY_GTE_6",

	"Progeny Age Gap <9 Month":
		"PROGENY_AGE_GAP_LT_9_MONTH",

	"Self Name Mismatch":
		"SELF_NAME_MISMATCH",

	"Unmapped with Last SIR":
		"UNMAPPED_WITH_LAST_SIR",
} as const;

export type AsddReasonCode =
	(typeof ASDD_REASON_CODES)[keyof typeof ASDD_REASON_CODES];

export type DiscrepancyReasonCode =
	(typeof DISCREPANCY_REASON_CODES)[keyof typeof DISCREPANCY_REASON_CODES];

export function getAsddReasonCode(
	reason: string,
): string | null {
	return ASDD_REASON_CODES[
		reason as keyof typeof ASDD_REASON_CODES
	] ?? null;
}

export function getDiscrepancyReasonCode(
	reason: string,
): string | null {
	return DISCREPANCY_REASON_CODES[
		reason as keyof typeof DISCREPANCY_REASON_CODES
	] ?? null;
}