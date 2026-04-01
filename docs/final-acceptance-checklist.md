# Tikur Abay Final Acceptance Checklist

## Console
- [ ] `/` loads for super admin
- [ ] `/dashboards/executive` loads for executive users
- [ ] `/operations/supplier-agent` loads and queue/detail selection works
- [ ] `/operations/djibouti-release` loads and release actions render
- [ ] `/operations/corridor-dispatch` loads and trip queue/detail selection works
- [ ] `/operations/dry-port-yard` loads and closure actions render
- [ ] `/finance` loads and finance/customs control cards render

## Customer Portal
- [ ] `/dashboard` or `/` loads with styled shipment hero
- [ ] `/shipments` loads and tabs switch cleanly
- [ ] `/documents` loads with working filters and empty-state fallback
- [ ] `/payments` loads with working filters and empty-state fallback
- [ ] `/support` loads with working filters and empty-state fallback

## Mobile
- [ ] welcome -> customer OTP -> customer shell
- [ ] welcome -> driver OTP -> approved driver shell
- [ ] new driver -> registration -> KYC upload -> KYC pending
- [ ] driver transit pack shows trip, BL, container, seal, route, and QR
- [ ] checkpoint update and issue report screens submit cleanly in demo mode

## Backend / Data
- [ ] shipment links to cargo items, documents, containers, trips, milestones, and exceptions
- [ ] role-aware shipment visibility works
- [ ] communications preview/send/history endpoints respond cleanly
- [ ] communication templates, drafts, schedules, rules, logs, and notifications seed successfully
- [ ] customer-visible data excludes internal-only notes
- [ ] driver-visible data is limited to assigned trip and packet

## Communications
- [ ] payment reminder / thank-you templates render
- [ ] trip delay / checkpoint hold events create logs or notifications
- [ ] KYC status change generates communication event
- [ ] support reply generates communication event
- [ ] local stub mode works without SMTP/SMS/Telegram credentials

## Local Verification
- [ ] `pnpm --filter @tikur-abay/backend build`
- [ ] `pnpm --filter @tikur-abay/admin build`
- [ ] `pnpm --filter @tikur-abay/customer-portal build`
- [ ] `pnpm seed:local`
- [ ] `pnpm smoke:seed-integrity`
- [ ] `flutter analyze` in `apps/driver`
- [ ] `pnpm qa:final`
