# Backend Module Structure

Backend app root: `apps/backend/src`

## Core bootstrap

- `main.ts`: Nest bootstrap, global API prefix, Swagger setup
- `app.module.ts`: registers all Phase 1 modules

## Phase 1 modules

- `auth`: JWT login, refresh token rotation, guards, RBAC policies
- `users`: users, roles, profile, activation/deactivation
- `customers`: customer master data and commercial account profile
- `drivers`: driver identity, license info, emergency contacts, assignments
- `vehicles`: fleet master, status, current assignment, last known location
- `trips`: dispatch workflow, trip timeline, checkpoints, POD enforcement
- `gps`: location ingest, live location query, provider abstraction
- `maintenance`: due alerts by km/date, service blocks, maintenance history
- `agreements`: agreement lifecycle, versions, approval flow
- `documents`: uploads, download metadata, approval, expiry tracking
- `chat`: trip rooms, customer rooms, internal rooms, unread counts
- `payments`: invoices, payments, balances, customer allocations
- `hr`: employee basics, department, contract dates, payroll references
- `dashboards`: executive and operational summary endpoints
- `notifications`: notification center feed and read tracking
- `audit-logs`: all major business events and status-change history

## Recommended sub-structure per module

```text
modules/<module-name>/
├── dto/
├── schemas/
├── controllers/
├── services/
├── gateways/        # socket-enabled modules only
├── policies/        # RBAC or business rule helpers where needed
└── <module>.module.ts
```
