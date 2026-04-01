# Tikur Abay Transport Business Management Platform

Monorepo scaffold for a transport ERP platform covering operations, maintenance, marketing, finance, management, HR, live chat, documents, agreements, tracking, and dashboards.

## Stack

- Backend: NestJS + TypeScript + Mongoose
- Database: MongoDB
- Admin web: Next.js + TypeScript + Tailwind
- Customer portal: Next.js + TypeScript + Tailwind
- Mobile app: Flutter (single app with customer and driver experiences)
- Realtime: Socket.IO
- Auth: JWT + refresh tokens + RBAC
- File storage: S3-compatible object storage
- Tracking: provider abstraction for phone GPS now, hardware GPS later

## Monorepo Layout

- `apps/backend`: NestJS API scaffold, schemas, seed data, route catalog, RBAC definitions
- `apps/admin`: admin dashboard route scaffold for all business consoles
- `apps/customer-portal`: customer-facing portal scaffold
- `apps/driver`: Flutter mobile app with customer and driver role experiences
- `packages/shared`: shared domain constants placeholder
- `docs`: architecture inventories requested for phase one

## Phase One Output

This initial generation includes:

- folder structure
- MongoDB schema catalog
- REST API route inventory
- full ERD reference
- full API catalog reference
- full screen inventory reference
- admin UI page inventory and placeholders
- Flutter driver app screen inventory and placeholders
- sample seed data and seeded local accounts
- dashboard widget catalog
- RBAC permissions matrix
- local infrastructure via `docker-compose.yml`
- runnable Flutter driver app MVP
- runnable backend/admin/customer MVP once dependencies are installed
- hardened management tracking, maintenance alerts, driver/employee performance widgets, and admin login health checks

## Seeded Local Accounts

Seeded local accounts are defined in [local.seed.ts](/Users/getnetbelay/Documents/Tikur_Abay/apps/backend/src/database/seed/local.seed.ts).

- `superadmin@tikurabay.com` / `ChangeMe123!`
- `executive@tikurabay.com` / `ChangeMe123!`
- `opsmanager@tikurabay.com` / `ChangeMe123!`
- `dispatcher@tikurabay.com` / `ChangeMe123!`
- `technical@tikurabay.com` / `ChangeMe123!`
- `marketing@tikurabay.com` / `ChangeMe123!`
- `finance@tikurabay.com` / `ChangeMe123!`
- `hr@tikurabay.com` / `ChangeMe123!`
- `driver.demo@tikurabay.com` / `ChangeMe123!`
- `customer1@tikurabay.com` / `ChangeMe123!`

## Architecture References

- [Platform ERD](/Users/getnetbelay/Documents/Tikur_Abay/docs/platform-erd.md)
- [Platform API Catalog](/Users/getnetbelay/Documents/Tikur_Abay/docs/platform-api-catalog.md)
- [Platform Screen Inventory](/Users/getnetbelay/Documents/Tikur_Abay/docs/platform-screen-inventory.md)
- [Backend Module Structure](/Users/getnetbelay/Documents/Tikur_Abay/docs/backend-module-structure.md)
- [Frontend Page Map](/Users/getnetbelay/Documents/Tikur_Abay/docs/frontend-page-map.md)

## Local Ports

- Admin console: `http://localhost:6010`
- Customer portal: `http://localhost:6011`
- Backend API / Swagger: `http://localhost:6012/docs`

## MVP Modules Implemented

- MongoDB-backed management tracking API with branch, route, trip status, vehicle status, and geofence filters
- Maintenance alerts API with configurable tire inspection threshold support at `4000 km`
- Driver and employee performance API with sortable KPI outputs
- Operations Hub workspace with live fleet availability, fuel and odometer tracking, service history, due-soon panels, operational alerts, and rental partner recommendations
- Customers workspace with KPI row, commercial account filters, account-manager ownership, unpaid-balance visibility, and customer detail drawers
- Agreements workspace with lifecycle KPIs, sign-status filters, contract table, audit trail, and document-aware detail drawers
- Marketing workspace with lead pipeline, quote request table, branch vehicle availability, and follow-up queue tied to commercial closure
- Finance workspace with receivables KPIs, outstanding invoices, collections queue, route profitability, salary and commission summary, and invoice detail drawers
- Document workspace with KPI strip, register filters, linked entity detail drawers, and download workflow
- Payments workspace with KPI strip, payment register filters, receipt context, and invoice-linked detail drawers
- Maintenance alerts workspace with due/overdue KPIs, workshop-linked queue, and repair-context detail drawers
- Admin executive dashboard widgets for fleet, maintenance, and performance
- Executive dashboard control-room layout with urgent action strip, KPI cards, live fleet map, top customers, revenue by route, incidents, and unpaid invoices
- Employee and driver performance summary/detail pages with filters, server-side pagination, drill-down, and CSV export
- Maintenance workflow routes for due, overdue, blocked, repair orders, plans, notifications, and vehicle history
- Admin login availability check against the backend health endpoint
- Unified role-based web console with protected navigation and customer-in-console access
- Single mobile app with customer and driver role selection at registration
- Driver KYC approval workflow that blocks trip operations until approved
- Driving school module with student registration, training progress, exams, DL follow-up, payments, and document visibility
- Customer mobile tabs for bookings, trips, documents, payments, and profile
- Driver mobile tabs for trip, report, activity, docs, alerts, and profile
- Active mobile actions for trip status, report creation, booking requests, agreement signing, payment actions, chat send, document upload, and alert read flows
- Launch Center with persistent checklist state, activity history, leadership launch report, and role-based launch access controls

## Clickable Flow Checklist

- Web login authenticates against `/api/v1/auth/login`
- Executive dashboard cards open employee and driver performance pages
- Latest trips open trip detail pages
- Top customers open customer detail pages
- Live fleet panel opens `/tracking`
- Maintenance alerts panel opens `/maintenance-alerts`
- Maintenance dashboard quick actions open due, overdue, blocked, repair order, plan, notification, and vehicle history pages
- Operations Hub answers assignment, safety, overdue, fuel, due-soon, and rental-partner decisions from a single page backed by `/api/v1/operations/*`
- Operations Hub KPI cards open actionable detail drawers instead of repeating the same counts lower on the page
- Fleet Availability Board now supports search, sorting, filters, export, and right-side vehicle detail drawers with driver phone and location context
- Dashboard design rule: KPI rows are summary-only; lower sections must add detail, people, phones, locations, due dates, or actions instead of repeating the same metric
- Launch Center edits are restricted to `super_admin`, `executive`, and `operations_manager`, while `/settings/launch/report` is the wider read-only launch view
- Unauthorized launch-route access now redirects to `/access-denied` instead of silently bouncing to another dashboard
- Customers, Agreements, Marketing, and Finance now share the reusable workspace filter bar and right-side detail drawer pattern
- Commercial workflow now links customer accounts, agreements, quotes, invoices, payments, and follow-up tasks across the admin console
- Repair orders can be created, advanced through workflow states, and linked to driver notifications
- Customers list opens customer detail routes
- Trips list opens trip detail routes
- Driver app login calls backend auth
- Mobile registration supports customer and driver onboarding through `/api/v1/auth/register`
- Driver mode blocks trip access when KYC status is not `approved`
- Driver app trip tab opens details, status update, timeline, and POD upload flows
- Driver app report cards open real report forms and submit to `/api/v1/driver-reports`
- Customer mobile book tab creates bookings and quote requests against Mongo-backed APIs
- Customer mobile payments tab loads customer invoice/payment history and can trigger `pay` actions
- Driver app chat sends messages to `/api/v1/chat/rooms/:id/messages`
- Driver app documents upload through `/api/v1/documents/upload`
- Local document uploads are materialized under `LOCAL_STORAGE_DIR` and served through signed backend URLs when `FILE_STORAGE_MODE=local`
- MinIO/S3 mode supports presigned document upload handoff through `/api/v1/documents/upload-url` and `/api/v1/documents/finalize-upload`
- Driver app alerts mark read through `/api/v1/notifications/:id/read`
- Driving school admin dashboard loads through `/api/v1/driving-school/dashboard`

## UI Audit Summary

- Fixed dead driver controls:
  `status update`, `report create`, `chat send`, `document upload`, `alert tap`, `profile detail tap`
- Fixed dead web controls:
  `latest trip rows`, `top customer rows`, `live fleet panel`, `maintenance panel`, `customer cards`, `trip cards`
- Replaced placeholder web pages:
  `chat`, `documents`, `driver-reports`, `notifications`, `vehicles`, `drivers`, `users`, `customer detail`, `trip detail`

## Launch Access Model

- Edit launch checklist state: `super_admin`, `executive`, `operations_manager`
- Read launch report only: `super_admin`, `executive`, `operations_manager`, `technical_manager`, `finance_officer`, `hr_officer`, `marketing_officer`
- Launch edit workspace: `/settings/launch`
- Read-only leadership report: `/settings/launch/report`
- Unauthorized launch access: `/access-denied`

The launch report is intentionally read-only. Status and note changes must be made in the Launch Center by an authorized launch owner.

## Local Development

1. Create environment files from the examples and set strong JWT secrets:

```bash
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
```

The backend accepts `MONGODB_URI` or `MONGO_URI`, but `MONGODB_URI` is preferred. The runtime uses the database name from the connection string you provide.

2. Install dependencies:

```bash
pnpm install
```

List the local operations commands:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm help:local
```

3. Start the full local stack without Docker:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm local:up
```

This starts the backend, admin console, and customer portal directly on localhost and writes logs under `.local/logs/`.

To stop the local stack:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm local:down
```

4. Seed MongoDB with connected Tikur Abay local seed data:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm seed:local

To clear and reseed only the Tikur Abay local database collections:

```bash
pnpm reset:local
pnpm seed:local
```
```

The current management seed is intentionally smaller and clearer for local verification and stakeholder walkthroughs:
- `80` vehicles
- `120` customers
- `400` trips
- `28` employees
- `24` drivers
- `90` agreements
- `120` invoices
- `100` payments
- `70` maintenance records
- `60` driver reports
- customer profiles, driver profiles, driver KYC requests, bookings, quotes, agreement signatures, driver availability reports, leave requests, fuel logs, incidents, activity logs, and uploaded documents

5. Start the backend:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
PORT=6012 pnpm --filter @tikur-abay/backend dev
```

For local file-backed documents:

```bash
FILE_STORAGE_MODE=local
API_PUBLIC_URL=http://localhost:6012/api/v1
LOCAL_STORAGE_DIR=var/uploads
```

For MinIO/S3-backed documents:

```bash
FILE_STORAGE_MODE=s3
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=tikur-abay-documents
S3_ACCESS_KEY=tikurabay
S3_SECRET_KEY=tikurabay123
API_PUBLIC_URL=http://localhost:6012/api/v1
```

Optional performance maintenance commands:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm --filter @tikur-abay/backend indexes:sync
pnpm --filter @tikur-abay/backend explain:dashboard
```

`indexes:sync` applies the current Mongoose index definitions to existing MongoDB collections.
`explain:dashboard` prints execution stats for the live fleet, executive summary, maintenance, finance, and performance query paths so index usage can be verified after seeding.

6. Start the admin console:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
NEXT_PUBLIC_API_URL=http://localhost:6012/api/v1 pnpm --filter @tikur-abay/admin dev --port 6010
```

7. Start the customer portal:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
NEXT_PUBLIC_API_URL=http://localhost:6012/api/v1 pnpm --filter @tikur-abay/customer-portal dev --port 6011
```

7. Run backend tests:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm --filter @tikur-abay/backend test
```

Run the full staged verification bundle:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm verify:all
```

This runs:
- backend tests
- web verification
- mobile verification
- local live stack verification
- and prints a compact pass/fail summary

Run the pre-deploy release checklist:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm release:checklist
```

This runs:
- local production env validation
- backend tests
- web verification
- mobile verification
- Docker image build
- and prints a compact pass/fail summary before you bring the stack up

Generate a dated acceptance report template for operator sign-off:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm acceptance:report
```

Optional metadata:

```bash
RELEASE_ID=tikur-abay-2026-03-12 \
RELEASE_ENVIRONMENT=local \
RELEASE_OPERATOR=getnet \
pnpm acceptance:report
```

Generate a dated local status report:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm status:report
```

This writes a Markdown report under `deploy/reports/` with the current:
- backend health
- admin availability
- customer portal availability
- Socket.IO reachability
- authenticated metrics status

Clean up old generated reports:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm reports:cleanup
```

Optional retention count:

```bash
REPORT_KEEP=10 pnpm reports:cleanup
```

Clean all old local release artifacts in one pass:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm cleanup:local
```

This runs:
- report cleanup
- support bundle cleanup

Run the final local release sign-off flow:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm release:signoff
```

This runs:
- acceptance report generation
- full verification bundle
- and prints a compact pass/fail summary for final local sign-off

Run the full local release flow end to end:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm release:local
```

This runs:
- release checklist
- local production startup and verification
- final release sign-off

Check the current local stack status:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm status:local
```

This prints a compact snapshot for:
- backend health
- admin availability
- customer portal availability
- Socket.IO reachability
- authenticated metrics access

Run a local diagnostics pass:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm doctor:local
```

This checks:
- required commands
- `.env.local-prod`
- Docker daemon
- local stack ports
- compose service presence
- backend, admin, and customer reachability

Run the full local diagnose flow:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm diagnose:local
```

This runs:
- `doctor:local`
- `status:local`
- `prod:verify`
- and captures a support bundle automatically if verification fails

Restart the full local production-style stack:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm restart:local
```

This runs:
- `prod:down`
- `prod:up`
- `status:local`

Refresh the local seeded business data:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm refresh:data:local
```

This runs:
- `reset:local`
- `seed:local`
- `smoke:seed-integrity`
- `status:local`

Generate a local support bundle:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm support:local
```

This writes a timestamped bundle under `deploy/support/` with:
- redacted local env file
- compose service list
- recent compose logs
- doctor output
- status output
- production verify output

Clean up old support bundles:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm support:cleanup
```

Optional retention count:

```bash
SUPPORT_BUNDLE_KEEP=5 pnpm support:cleanup
```

Tail the local production-style logs:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm logs:local
```

Optional service filter:

```bash
pnpm logs:local backend admin
```

Operator runbooks:
- [Deployment Runbook](/Users/getnetbelay/Documents/Tikur_Abay/deploy/DEPLOYMENT.md)
- [Release Checklist](/Users/getnetbelay/Documents/Tikur_Abay/deploy/RELEASE_CHECKLIST.md)
- [Cutover Checklist](/Users/getnetbelay/Documents/Tikur_Abay/deploy/CUTOVER_CHECKLIST.md)
- [Frontend Production Checklist](/Users/getnetbelay/Documents/Tikur_Abay/deploy/FRONTEND_PRODUCTION_CHECKLIST.md)
- [Production Acceptance Checklist](/Users/getnetbelay/Documents/Tikur_Abay/deploy/PRODUCTION_ACCEPTANCE_CHECKLIST.md)
- [Mobile Release Guide](/Users/getnetbelay/Documents/Tikur_Abay/deploy/MOBILE_RELEASE.md)

7a. Run web frontend verification:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm web:verify
```

This runs:
- admin console production build
- customer portal production build
- and prints a compact pass/fail summary

7b. Run browser UI verification against the running stack:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm browser:verify
```

This runs Playwright browser flows for:
- admin login and protected-route redirect
- executive dashboard render
- customer portal home render
- customer login and dashboard render

To skip browser verification in constrained local environments:

```bash
SKIP_BROWSER_VERIFY=1 pnpm prod:verify
```

8. Run a local smoke check against the running stack:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm smoke:local
pnpm smoke:seed-integrity
pnpm smoke:admin-routes
pnpm smoke:web-ui
pnpm smoke:mobile-api
pnpm smoke:realtime
pnpm smoke:auth-refresh
```

`pnpm prod:verify` now includes browser UI verification by default unless `SKIP_BROWSER_VERIFY=1`.

Optional overrides:

```bash
API_BASE_URL=http://localhost:6012/api/v1 \
ADMIN_BASE_URL=http://localhost:6010 \
CUSTOMER_BASE_URL=http://localhost:6011 \
SMOKE_EMAIL=superadmin@tikurabay.com \
SMOKE_PASSWORD=ChangeMe123! \
pnpm smoke:local
```

The smoke commands now fail early with a direct message if the backend, web apps, or Socket.IO endpoint are not reachable.

10. Read the local operational metrics summary:

```bash
curl -H "Authorization: Bearer <access-token>" http://localhost:6012/api/v1/metrics
```

This returns a compact JSON summary for:
- fleet status counts
- active and delayed trips
- maintenance due and open notifications
- incidents and driver reports
- overdue invoices and payment activity
- document and activity volume
- agreements awaiting signature
- active hiring candidates

11. Export lightweight Prometheus-style metrics:

```bash
curl -H "Authorization: Bearer <access-token>" http://localhost:6012/api/v1/metrics/prometheus
```

This exposes a small text metric set for local scraping and operational checks.

9. Start the single mobile app:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay/apps/driver
flutter pub get
flutter run -d "iPhone 17 Pro"
```

Or use the local mobile helper:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm mobile:run:local
```

The mobile app now supports two experiences:
- Customer registration/login -> `Home`, `Book`, `My Trips`, `Documents`, `Payments`, `Profile`
- Driver registration/login -> `Trip`, `Report`, `Activity`, `Docs`, `Alerts`, `Profile`

Driver seeded access is KYC-gated. Drivers with non-approved KYC will see the KYC pending screen instead of trip operations.

### Mobile Release Profiles

The driver app now supports environment-based release builds through `--dart-define`:

```bash
pnpm mobile:build:apk:stage
pnpm mobile:build:apk:prod
pnpm mobile:build:appbundle:stage
pnpm mobile:build:appbundle:prod
pnpm mobile:build:ios:stage
pnpm mobile:build:ios:prod
```

Environment values:
- `TIKUR_ABAY_APP_ENV=local|stage|production`
- `TIKUR_ABAY_API_URL=<api-base-url>`

Non-production builds show a small environment badge in the app so test users can distinguish local and stage builds from production.

Mobile release runbook:
- [MOBILE_RELEASE.md](/Users/getnetbelay/Documents/Tikur_Abay/deploy/MOBILE_RELEASE.md)

Stage and production config templates:
- [stage.example.json](/Users/getnetbelay/Documents/Tikur_Abay/apps/driver/config/stage.example.json)
- [production.example.json](/Users/getnetbelay/Documents/Tikur_Abay/apps/driver/config/production.example.json)

## Local Production-Style Stack

For a local deployment-style run with Mongo, Redis, MinIO, backend, admin, customer portal, and nginx reverse proxy:

1. Create the local production env file:

```bash
cp .env.local-prod.example .env.local-prod
```

Validate it before startup:

```bash
pnpm env:validate:local-prod
```

2. Start the full stack and seed it:

```bash
cd /Users/getnetbelay/Documents/Tikur_Abay
pnpm prod:up
```

This starts:
- MongoDB
- Redis
- MinIO
- Backend API
- Admin console
- Customer portal
- Nginx reverse proxy

`pnpm prod:up` now:
- validates `.env.local-prod`
- checks that `docker`, `pnpm`, `curl`, `node`, and `lsof` are available
- checks that the Docker daemon is reachable
- fails early if required local ports are already occupied
- starts the stack
- waits for Mongo, backend, admin, customer portal, and proxy readiness
- seeds local data
- runs a full local production verification pass before reporting success
- automatically tears the stack down again if startup fails partway through

Local production-style URLs:
- Admin console: `http://localhost:6010`
- Customer portal: `http://localhost:6011`
- Backend Swagger: `http://localhost:6012/docs`
- Unified proxy entry: `http://localhost:6080`
- Customer via proxy: `http://localhost:6080/customer/`
- MinIO console: `http://localhost:9001`

3. Stop the full stack:

```bash
pnpm prod:down
```

`pnpm prod:down` now checks Docker availability before shutdown.

4. Verify the running stack:

```bash
pnpm prod:verify
```

`pnpm prod:verify` now prints a compact pass/fail summary by verification stage at the end of the run.

If you want a single command that both boots and verifies, use:

```bash
pnpm prod:up:verify
```

This checks:
- backend health and database connectivity
- local seeded data integrity
- auth login and authenticated API access
- admin middleware route protection and role redirects
- admin and customer rendered page content
- customer and driver mobile API flows
- refresh-token rotation and recovered authenticated access
- executive summary and live fleet map APIs
- chat and notification APIs
- Socket.IO handshake availability
- authenticated Socket.IO connection
- admin and customer web app availability

5. Build production container images without starting:

```bash
pnpm prod:build
```

`pnpm prod:build` now:
- validates `.env.local-prod`
- checks Docker CLI and daemon availability
- runs the local production compose image build only after preflight passes

6. Create a local backup of Mongo, uploaded files, and MinIO data:

```bash
pnpm backup:local
```

This writes a timestamped backup under `backups/` by default.
The command now fails early if Docker is unavailable or the required services are not running.

7. Restore from a local backup:

```bash
pnpm restore:local backups/20260312-120000
```

The restore flow stops the web/API services, restores Mongo and local file storage, restores MinIO data, and then starts the application services again.
It now also validates Docker availability, backup contents, and required stack services before applying the restore.

## Production Hardening Added

- Dockerfiles for backend, admin, and customer portal
- local production compose stack with Mongo, Redis, MinIO, and nginx
- standalone Next.js builds for container deployment
- CI workflow for backend build/test and admin build
- backend startup bound to `0.0.0.0` with shutdown hooks
- local production env template
- one-command local stack scripts: [start-all.sh](/Users/getnetbelay/Documents/Tikur_Abay/start-all.sh) and [stop-all.sh](/Users/getnetbelay/Documents/Tikur_Abay/stop-all.sh)
- local signed document download flow backed by files on disk in `LOCAL_STORAGE_DIR`
- MinIO/S3 presigned document upload and download flow with local fallback
- in-memory rate limiting for auth and public document-download endpoints
- Socket.IO backend gateway for chat rooms, user notifications, maintenance alerts, and fleet updates
- local backup/restore scripts for Mongo, local uploads, and MinIO object data
- structured request logging with request ids and a protected `/api/v1/metrics` summary endpoint
- global exception filter with structured error logs and a `/api/v1/metrics/prometheus` text export

## Environment Separation

The repo now includes environment templates for:
- local production-style: [`.env.local-prod.example`](/Users/getnetbelay/Documents/Tikur_Abay/.env.local-prod.example)
- staging: [`.env.stage.example`](/Users/getnetbelay/Documents/Tikur_Abay/.env.stage.example)
- production: [`.env.production.example`](/Users/getnetbelay/Documents/Tikur_Abay/.env.production.example)

Validate env files before deployment:

```bash
pnpm env:validate:local-prod
pnpm env:validate:stage
pnpm env:validate:prod
```

Deployment runbook:
- [DEPLOYMENT.md](/Users/getnetbelay/Documents/Tikur_Abay/deploy/DEPLOYMENT.md)

## Next Implementation Steps

1. move the remaining non-executive list/detail controllers off legacy demo arrays
2. add JWT refresh rotation and persistent audit logs
3. implement Socket.IO gateways for tracking and chat
4. expand admin and customer pages beyond the MVP routes
5. connect Flutter to live backend endpoints instead of demo-only flows
6. replace demo token signing with real JWT rotation and refresh-token persistence
7. wire the admin and mobile clients to the new Socket.IO realtime events
