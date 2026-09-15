# SIR Panvel API — Final Backend Foundation

This package contains the backend architecture update for:

- batched D1 imports
- one XLSX source-file record per workbook
- PDF-first -> Excel attachment
- optional PDF page count
- multiple PDF upload
- safe PDF replacement with unique R2 keys
- Cloudflare GraphQL R2 usage monitoring
- 8 GB application R2 storage safety gate
- ACTIVE/ARCHIVED dataset lifecycle endpoints
- validation failures returned before database writes

## Next commands

From the project folder:

```powershell
npm install
```

Apply migration 0008 to all three remote D1 databases:

```powershell
npx wrangler d1 migrations apply panvel-sir-asdd --remote
npx wrangler d1 migrations apply panvel-sir-draft --remote
npx wrangler d1 migrations apply panvel-sir-discrepancy --remote
```

Then deploy:

```powershell
npx wrangler deploy
```

The Worker requires these bindings/secrets:

- `ADMIN_TOKEN` — existing Worker secret
- `CF_API_TOKEN` — existing Cloudflare Analytics Read secret
- `CF_ACCOUNT_ID` — configured as a Worker variable
- `ASDD_DB`, `DRAFT_DB`, `DISCREPANCY_DB`
- `PDF_BUCKET`

There is intentionally **no `0009` migration** in this package.
