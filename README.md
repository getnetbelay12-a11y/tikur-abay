# Tikur Abay Transport Operations Platform

Production-ready MVP foundation for digitizing manual freight and logistics operations for a multimodal transport company in Ethiopia.

## Monorepo Structure

- `apps/backend` NestJS + TypeScript + Mongoose API
- `apps/admin-web` Next.js + TypeScript + Tailwind admin dashboard
- `apps/driver-app` Flutter driver mobile app
- `docs` architecture, API, workflow, and setup docs
- `infra` docker, sample API collection, and deployment helpers
- `scripts` seed and local utility scripts

## Core Capabilities

- JWT + refresh token authentication with RBAC
- Shipment intake and dispatch workflow
- Document and agreement lifecycle management
- Driver trip execution and GPS timeline hooks
- Incident reporting and notifications
- Operations and management dashboards
- Audit logging across critical state changes

## Local Setup

### 1. Backend

```bash
cd apps/backend
npm install
npm run start:dev
```

### 2. Admin Web

```bash
cd apps/admin-web
npm install
npm run dev
```

### 3. Driver App

```bash
cd apps/driver-app
flutter pub get
flutter run
```

### 4. Full Local Stack

```bash
docker compose up --build
```

## Demo Accounts

- Super Admin: `superadmin@tikurabay.et` / `DemoPass123!`
- Operations Manager: `ops.manager@tikurabay.et` / `DemoPass123!`
- Dispatcher: `dispatcher@tikurabay.et` / `DemoPass123!`
- Branch Officer: `branch.officer@tikurabay.et` / `DemoPass123!`
- Driver: `driver.one@tikurabay.et` / `1234`
- Customer: `customer.demo@tikurabay.et` / `DemoPass123!`
- Compliance Officer: `compliance@tikurabay.et` / `DemoPass123!`
- Executive Viewer: `executive@tikurabay.et` / `DemoPass123!`

## Key Docs

- [Architecture](./docs/architecture.md)
- [API Endpoints](./docs/api-endpoints.md)
- [Seed Data](./docs/seed-data.md)
- [Roles And Permissions](./docs/rbac.md)

