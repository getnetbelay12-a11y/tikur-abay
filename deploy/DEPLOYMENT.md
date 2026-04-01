# Tikur Abay Deployment Runbook

## Environment Files

Use the matching template for each deployment target:

- local production-style: `.env.local-prod.example`
- staging: `.env.stage.example`
- production: `.env.production.example`

Create real files before deployment:

```bash
cp .env.stage.example .env.stage
cp .env.production.example .env.production
```

Do not commit real secrets.

## Required Validation

Validate each env file before deployment:

```bash
pnpm env:validate:local-prod
pnpm env:validate:stage
pnpm env:validate:prod
```

The validator checks required keys and rejects placeholder values.

## Release Checklist

See the detailed operator checklist in [RELEASE_CHECKLIST.md](/Users/getnetbelay/Documents/Tikur_Abay/deploy/RELEASE_CHECKLIST.md).
For environment promotion and rollback flow, use [CUTOVER_CHECKLIST.md](/Users/getnetbelay/Documents/Tikur_Abay/deploy/CUTOVER_CHECKLIST.md).

1. Validate the target env file.
2. Run the local release checklist:
   ```bash
   pnpm release:checklist
   ```
3. Build images:
   ```bash
   pnpm prod:build
   ```
4. Start the stack or deploy the updated images.
5. Run verification:
   ```bash
   pnpm prod:verify
   ```
6. Confirm:
   - `/api/v1/health`
   - `/api/v1/metrics`
   - `/api/v1/metrics/prometheus`
   - admin login
   - executive dashboard
   - chat
   - document download
7. Create a post-deploy backup:
   ```bash
   pnpm backup:local
   ```

## Reverse Proxy Notes

- Route `/` to the admin console.
- Route `/customer/` to the customer portal.
- Route `/api/` and `/socket.io/` to the backend.
- Preserve `x-request-id`, `x-forwarded-for`, and `x-forwarded-proto`.

## Storage Notes

- `FILE_STORAGE_MODE=local` is acceptable for local production-style use only.
- Use `FILE_STORAGE_MODE=s3` for staging and production.
- Ensure `S3_BUCKET` already exists and the credentials permit read/write access.

## Data Safety

- Never run local reset/seed against a production database.
- Keep staging and production Mongo database names separate.
- Run backup before major schema or seed changes.
