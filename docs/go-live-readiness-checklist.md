# Tikur Abay Go-Live Readiness Checklist

## Users and Access
- Confirm all real user accounts are created for executives, operations, dispatch, finance, HR, marketing, and support.
- Confirm each user is assigned to the correct branch and role.
- Verify role permissions against actual job responsibilities.
- Remove or disable demo-only accounts before production cutover.
- Confirm corridor desk roles can reach their own routes directly:
  China Port Agent, Djibouti Release, Transitor / Clearance, Dispatch, Yard, Empty Return.
- Confirm password reset and account recovery process.

## Branch Setup
- Confirm all production branches are created with correct names and codes.
- Verify branch-specific filters, dashboards, and routing behave correctly.
- Confirm branch-level ownership for operations, finance, HR, and maintenance.

## Notifications
- Verify in-app notifications for operations, maintenance, finance, agreements, and HR.
- Verify email, SMS, and push channel configuration.
- Confirm urgent alerts reach the correct owners.
- Verify unread/read flows and escalation handling.

## Signing and Payments
- Verify agreement signing flow end to end, including sign links, audit trail, and signed PDF access.
- Verify payment flow end to end, including invoice linkage, receipt visibility, and failed payment handling.
- Confirm finance can trace payment status changes and collection follow-up.

## Backups and Recovery
- Confirm MongoDB backup schedule and restore procedure.
- Confirm document storage backup and recovery plan.
- Confirm rollback approach for production release issues.

## Monitoring and Error Tracking
- Confirm uptime monitoring for admin, backend, customer portal, and mobile APIs.
- Confirm health checks for backend and database.
- Confirm error tracking and logging destination for frontend and backend failures.
- Confirm alert ownership for critical production incidents.

## Corridor Release Gate
- Confirm booking acceptance creates a shipment record before operations handoff.
- Confirm only dispatched trips with assigned drivers appear in the mobile app.
- Confirm customer-facing portal does not expose demo manifest panels or demo credentials in production.
- Confirm debug OTP is disabled and never returned by the mobile auth API in production.

## Final Gate
- Run role-based smoke tests on production-like data.
- Confirm no broken routes, dead buttons, or missing permissions on critical pages.
- Record final sign-off from product, operations, finance, and technical owners.
