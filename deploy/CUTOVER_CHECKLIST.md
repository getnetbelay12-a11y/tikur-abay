# Tikur Abay Cutover Checklist

Use this checklist when promoting a validated build from local or staging into a higher environment.

## Before Cutover

1. Confirm the target environment file is complete and validated.
2. Confirm the target Mongo database name is correct for the environment.
3. Confirm S3 or MinIO credentials are correct for the target environment.
4. Confirm Redis connectivity is available for notifications and queue-backed jobs.
5. Confirm the reverse proxy target URLs are correct for:
   - admin
   - customer portal
   - backend API
   - Socket.IO
6. Confirm mobile config files match the target API host and realtime host.

## Build Approval

Record:

- release identifier
- source commit
- operator
- approval timestamp

## Pre-Cutover Validation

Run:

```bash
pnpm release:checklist
pnpm verify:all
```

For mobile releases, also run:

```bash
pnpm mobile:verify
```

## Backup Before Cutover

Create a backup before applying the release:

```bash
pnpm backup:local
```

Record the backup path.

## Cutover Steps

1. Deploy the updated backend image.
2. Deploy the updated admin image.
3. Deploy the updated customer portal image if applicable.
4. Apply the target environment file.
5. Restart services in dependency order:
   - Mongo and Redis must be healthy first
   - backend next
   - web apps and proxy last
6. Confirm health:
   - `/api/v1/health`
   - `/api/v1/health/ready`
   - `/api/v1/metrics`
7. Run:
   ```bash
   pnpm prod:verify
   ```

## Functional Sign-Off

Confirm:

- admin login works
- executive dashboard loads real data
- live fleet tracking loads
- chat loads
- notifications unread count loads
- document download works
- authenticated realtime connects
- token refresh succeeds
- customer portal loads
- mobile config is pointing at the correct target environment

## Rollback Conditions

Rollback if any of these occur after cutover:

- backend health fails
- readiness fails
- executive dashboard is unavailable
- auth login or refresh fails
- realtime cannot authenticate
- document upload or download fails
- critical fleet or maintenance endpoints fail

## Rollback Steps

1. Stop the failed release.
2. Restore the last known good image set.
3. Restore data only if data corruption occurred:
   ```bash
   pnpm restore:local <backup-dir>
   ```
4. Re-run:
   ```bash
   pnpm prod:verify
   ```

## Final Sign-Off

Record:

- environment
- release identifier
- deployment start time
- deployment end time
- verification result
- rollback required: yes/no
- notes
