const GRAPHQL_URL = "https://api.cloudflare.com/client/v4/graphql";
const R2_BUCKET = "panvel-sir-pdfs";
const STORAGE_LIMIT_BYTES = 8 * 1024 ** 3;
const STORAGE_WARNING_BYTES = 7 * 1024 ** 3;
const CLASS_A_LIMIT = 1_000_000;
const CLASS_B_LIMIT = 10_000_000;
const CLASS_A_WARNING = 900_000;
const CLASS_B_WARNING = 9_000_000;

const CLASS_A = new Set([
	"ListBuckets", "PutBucket", "ListObjects", "PutObject", "CopyObject",
	"CompleteMultipartUpload", "CreateMultipartUpload", "LifecycleStorageTierTransition",
	"ListMultipartUploads", "UploadPart", "UploadPartCopy", "ListParts",
	"PutBucketEncryption", "PutBucketCors", "PutBucketLifecycleConfiguration",
]);
const CLASS_B = new Set([
	"HeadBucket", "HeadObject", "GetObject", "UsageSummary", "GetBucketEncryption",
	"GetBucketLocation", "GetBucketCors", "GetBucketLifecycleConfiguration",
]);

function monthStart(): string {
	const now = new Date();
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

async function graphql(
	env: Env,
	query: string,
	variables: Record<string, unknown>,
): Promise<any> {
	if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID) {
		throw new Error(
			"Cloudflare Analytics credentials are not configured.",
		);
	}

	const response = await fetch(GRAPHQL_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Accept": "application/json",
			"Authorization": `Bearer ${env.CF_API_TOKEN}`,
		},
		body: JSON.stringify({
			query,
			variables,
		}),
	});

	const responseText = await response.text();

	let body: any;

	try {
		body = JSON.parse(responseText);
	} catch {
		throw new Error(
			`Cloudflare Analytics returned HTTP ${response.status}: ${responseText.slice(0, 1000)}`,
		);
	}

	if (!response.ok) {
		const message =
			body?.errors?.map((error: any) => error?.message).filter(Boolean).join("; ") ||
			body?.messages?.map((message: any) => message?.message).filter(Boolean).join("; ") ||
			`HTTP ${response.status}`;

		throw new Error(
			`Cloudflare Analytics returned HTTP ${response.status}: ${message}`,
		);
	}

	if (body.errors?.length) {
		throw new Error(
			body.errors
				.map((error: any) => error?.message)
				.filter(Boolean)
				.join("; ") ||
			"Cloudflare Analytics query failed.",
		);
	}

	return body.data;
}

export async function getR2Usage(env: Env) {
	const startDate = monthStart();
	const endDate = new Date().toISOString();
	const operationsQuery = `query($accountTag:String!,$startDate:Time,$endDate:Time,$bucketName:String){viewer{accounts(filter:{accountTag:$accountTag}){r2OperationsAdaptiveGroups(limit:10000,filter:{datetime_geq:$startDate,datetime_leq:$endDate,bucketName:$bucketName}){sum{requests}dimensions{actionType}}}}}`;
	const storageQuery = `query($accountTag:String!,$startDate:Time,$endDate:Time,$bucketName:String){viewer{accounts(filter:{accountTag:$accountTag}){r2StorageAdaptiveGroups(limit:10000,filter:{datetime_geq:$startDate,datetime_leq:$endDate,bucketName:$bucketName},orderBy:[datetime_DESC]){max{objectCount,uploadCount,payloadSize,metadataSize}dimensions{datetime}}}}}`;
	const [operations, storage] = await Promise.all([
		graphql(env, operationsQuery, { accountTag: env.CF_ACCOUNT_ID, startDate, endDate, bucketName: R2_BUCKET }),
		graphql(env, storageQuery, { accountTag: env.CF_ACCOUNT_ID, startDate, endDate, bucketName: R2_BUCKET }),
	]);
	const groups = operations.viewer.accounts[0]?.r2OperationsAdaptiveGroups ?? [];
	let classA = 0, classB = 0;
	const byAction: Record<string, number> = {};
	for (const group of groups) {
		const action = group.dimensions?.actionType ?? "UNKNOWN";
		const requests = Number(group.sum?.requests ?? 0);
		byAction[action] = (byAction[action] ?? 0) + requests;
		if (CLASS_A.has(action)) classA += requests;
		else if (CLASS_B.has(action)) classB += requests;
	}
	const storageGroups = storage.viewer.accounts[0]?.r2StorageAdaptiveGroups ?? [];
	const latest = storageGroups[0]?.max ?? {};
	const payloadSize = Number(latest.payloadSize ?? 0);
	const metadataSize = Number(latest.metadataSize ?? 0);
	const totalBytes = payloadSize + metadataSize;
	return {
		source: "cloudflare_graphql_analytics",
		period: { start: startDate, end: endDate },
		bucket: R2_BUCKET,
		storage: { payloadBytes: payloadSize, metadataBytes: metadataSize, totalBytes, objectCount: Number(latest.objectCount ?? 0), uploadCount: Number(latest.uploadCount ?? 0), limitBytes: STORAGE_LIMIT_BYTES, warningBytes: STORAGE_WARNING_BYTES },
		operations: { classA, classB, classALimit: CLASS_A_LIMIT, classBLimit: CLASS_B_LIMIT, classAWarning: CLASS_A_WARNING, classBWarning: CLASS_B_WARNING, byAction },
		status: { storageWarning: totalBytes >= STORAGE_WARNING_BYTES, storageBlocked: totalBytes >= STORAGE_LIMIT_BYTES, classAWarning: classA >= CLASS_A_WARNING, classBWarning: classB >= CLASS_B_WARNING },
	};
}

export async function assertR2Capacity(env: Env, additionalBytes: number): Promise<Awaited<ReturnType<typeof getR2Usage>>> {
	if (!Number.isFinite(additionalBytes) || additionalBytes < 0) throw new Error("Invalid additional PDF size.");
	const usage = await getR2Usage(env);
	if (usage.storage.totalBytes + additionalBytes > STORAGE_LIMIT_BYTES) {
		throw new Error(`R2 storage safety limit reached. Current Cloudflare-reported usage is ${usage.storage.totalBytes} bytes; incoming upload is ${additionalBytes} bytes; application limit is ${STORAGE_LIMIT_BYTES} bytes.`);
	}
	return usage;
}
