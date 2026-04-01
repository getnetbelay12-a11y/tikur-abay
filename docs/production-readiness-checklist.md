# Tikur Abay Production Readiness Checklist

## Platform
- Rotate secrets before pilot rollout.
- Confirm MongoDB Atlas connectivity and network access.
- Validate backup and restore procedure.
- Review permissions for all production roles.
- Verify `ALLOW_DEBUG_OTP=false` in production and staging.
- Verify `ALLOW_DEMO_SCENARIO_TOOLS=false` in production and staging.
- Verify demo-only controls are hidden from admin dashboard, customer login, and portal landing in production builds.
- Confirm Launch Center role access:
  edit in `/settings/launch` only for `super_admin`, `executive`, `operations_manager`
  read-only `/settings/launch/report` for approved wider admin roles
- Verify restricted launch routes show `/access-denied` instead of silent redirect behavior.

## Web and Mobile
- Run route smoke test across all sidebar links.
- Verify responsive behavior for dashboard, operations, map, and chat layouts.
- Verify mobile document upload and retrieval.
- Verify language switching does not leave mixed labels in core pages.

## Business Flows
- Verify executive dashboard drill-downs.
- Verify booking -> origin -> Djibouti release -> clearance -> dispatch -> POD -> empty return runs without desk ownership gaps.
- Run `pnpm e2e:critical` and require a pass before any local production-style sign-off.
- Verify the fresh-booking manual E2E runbook in [e2e-manual-custom-booking-runbook.md](/Users/getnetbelay/Documents/Tikur_Abay/docs/e2e-manual-custom-booking-runbook.md) is current and matches the active UI.
- Verify no desk queue is relying on stale local-only browser state by opening the same booking across roles after logout/login.
- Verify dispatch cannot proceed when clearance is not ready.
- Verify driver mobile only receives assigned trips with pushed transit packs, not raw bookings.
- Verify operations assignment and blocked vehicle flows.
- Verify agreement signing and signed PDF retrieval.
- Verify payment posting and receipt visibility.
- Verify HR, KYC, and driving school workflows.

## Demo and Support
- Reset and reseed demo data before pilot rehearsal.
- Confirm role-based demo accounts.
- Export UAT feedback template before workshops.
- Confirm support owner for each pilot phase.
- Keep one operator-owned evidence pack for the latest manual E2E run: ids, screenshots, generated documents, and failure notes.
