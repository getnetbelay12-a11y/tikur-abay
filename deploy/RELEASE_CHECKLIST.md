# Tikur Abay Release Checklist

Use this checklist before promoting a local, staging, or production build.

## Pre-Release

1. Confirm the target environment file exists and contains real values.
2. Validate the environment file:
   ```bash
   pnpm env:validate:local-prod
   pnpm env:validate:stage
   pnpm env:validate:prod
   ```
3. Run the release checklist:
   ```bash
   pnpm release:checklist
   ```
4. Confirm local seed data is not being pointed at a non-local database.
5. Confirm storage mode is correct:
   - local only for local production-style runs
   - s3 for stage or production

## Build and Startup

1. Build deployable images:
   ```bash
   pnpm prod:build
   ```
2. Start the local production-style stack or deploy the updated images:
   ```bash
   pnpm prod:up
   ```
3. Run staged verification:
   ```bash
   pnpm prod:verify
   ```

## Functional Checks

Confirm all of the following:

- `GET /api/v1/health` returns `ok`
- `GET /api/v1/metrics` returns data for an executive/admin token
- admin login works
- executive dashboard loads
- live fleet tracking loads
- admin chat loads
- notifications unread count loads
- document download works
- authenticated Socket.IO connection succeeds
- access token refresh flow succeeds

## Mobile Checks

1. Validate mobile config:
   ```bash
   pnpm mobile:verify
   ```
2. If building a release:
   - confirm correct config file exists
   - confirm Android signing config exists if needed
   - confirm iOS export plist exists if needed

## Frontend Sign-Off

Use the user-facing validation checklist in [FRONTEND_PRODUCTION_CHECKLIST.md](/Users/getnetbelay/Documents/Tikur_Abay/deploy/FRONTEND_PRODUCTION_CHECKLIST.md).

## Final Acceptance

Use [PRODUCTION_ACCEPTANCE_CHECKLIST.md](/Users/getnetbelay/Documents/Tikur_Abay/deploy/PRODUCTION_ACCEPTANCE_CHECKLIST.md) for the final release decision.

## Backup and Recovery

Before a major deployment or restore-sensitive change:

```bash
pnpm backup:local
```

If rollback is required, use:

```bash
pnpm prod:down
pnpm restore:local <backup-dir>
pnpm prod:up
```

## Rollback Triggers

Rollback immediately if any of these fail after deploy:

- health or readiness is unstable
- executive dashboard cannot load
- login or token refresh fails
- realtime connection cannot authenticate
- document download fails
- critical maintenance or fleet endpoints fail

## Sign-Off

Record:

- environment
- build date/time
- operator
- verification result
- backup path
- rollback required: yes/no
