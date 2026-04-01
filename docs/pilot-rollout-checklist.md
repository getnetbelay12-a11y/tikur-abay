# Tikur Abay Pilot Rollout Plan

## Demo Rehearsal Checklist

| Role | Rehearsal Goal |
| --- | --- |
| Executive | Review the five-question executive dashboard, open operations and finance drill-downs, confirm no duplicate summaries. |
| Operations Manager | Assign a vehicle, inspect blocked units, open fleet drawer, validate trip and maintenance handoff. |
| Dispatcher | Review trip list, live tracking, driver reports, and chat follow-up workflow. |
| Marketing | Validate leads, quotes, agreements, and customer account workflows. |
| Finance | Validate outstanding invoices, collections queue, payments drawer, and payout summary. |
| HR | Validate HR console, driver KYC queue, expiry alerts, and driving school flow. |
| Driver | Validate trip execution, reporting, document upload, and alerts on mobile. |
| Customer | Validate customer desk, tracking, documents, invoices, and payments. |

## Pilot Phases

### Phase 1
- Executive dashboard
- Operations Hub
- Fleet tracking
- Maintenance

### Phase 2
- Customers
- Agreements
- Payments
- Notifications

### Phase 3
- HR
- Driver KYC
- Driving school
- Chat
- Settings

## Launch Access Model

- Launch checklist updates happen in `/settings/launch`.
- Only `super_admin`, `executive`, and `operations_manager` should edit launch checklist state.
- Wider admin roles should use `/settings/launch/report` for read-only rollout review.
- If a user opens a restricted launch page, the console now sends them to `/access-denied` with a clear explanation instead of silently redirecting them elsewhere.

## Role-Based Training Outline

| Role | Training Topics |
| --- | --- |
| Executive | Login, dashboard scan, drill-downs, refresh, export context |
| Operations | Operations Hub, fleet board, live map, trip escalation |
| Dispatcher | Trips, driver reports, chat, dispatch follow-up |
| Marketing | Customers, leads, quotes, agreements, branch supply |
| Finance | Payments, finance console, collections, route margin |
| HR | HR console, KYC, driving school, expiry alerts |
| Driver | Trip, report, activity, documents, alerts |
| Customer | Home, trips, documents, invoices, payments |
