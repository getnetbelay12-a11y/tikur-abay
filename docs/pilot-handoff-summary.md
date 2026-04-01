# Tikur Abay Pilot Handoff Summary

## What is ready

- Executive Dashboard is structured around the five executive questions only.
- Operations Hub is the day-to-day fleet operations workspace.
- Live Fleet Map, Maintenance, Customers, Agreements, Marketing, Finance, HR, Drivers, Documents, Notifications, Chat, and Driving School routes are in place.
- Launch Center is active with persistent checklist state, notes, and update history.
- Launch Report provides a read-only leadership summary with blockers, activity history, and CSV export.

## Where each role should go

| Role | Main starting page | Purpose |
| --- | --- | --- |
| Executive | `/dashboards/executive` | Scan urgent, blocked, moving, money, and today attention items |
| Operations Manager | `/operations` | Assign vehicles, review blockers, fuel, due-soon service, and fleet board |
| Dispatcher | `/operations` or `/trips` | Manage trip follow-up, reports, and dispatch actions |
| Technical Manager | `/maintenance-alerts` | Review due, overdue, blocked, and repair actions |
| Marketing | `/marketing` | Review leads, quotes, agreements, and branch supply |
| Finance | `/finance` | Review invoices, payments, collections, and payouts |
| HR | `/hr` | Review onboarding, KYC, expiry, and training items |

## Launch controls

- Edit launch checklist state: `/settings/launch`
- Read-only launch summary: `/settings/launch/report`
- Access denied fallback: `/access-denied`

Only these roles should edit launch checklist state:
- `super_admin`
- `executive`
- `operations_manager`

These roles should use the read-only launch report:
- `technical_manager`
- `finance_officer`
- `hr_officer`
- `marketing_officer`

## Daily pilot operating rhythm

1. Executive reviews dashboard and launch report.
2. Operations reviews delayed trips, blocked vehicles, due maintenance, and fleet assignment readiness.
3. Finance reviews failed payments, unsigned agreements, and collections.
4. HR reviews KYC, failed uploads, and support-sensitive exceptions.
5. Program lead updates Launch Center notes, blockers, and weekly release priorities.

## What to tell pilot users

- Use the dashboard for decisions, not for record editing.
- Use the workspaces for operational action.
- Use Launch Report for leadership review.
- Use Launch Center only if you are one of the assigned launch owners.
- If you see `/access-denied`, use the recommended read-only page or contact the launch owner.

## Handoff links

- Go-live checklist: [go-live-readiness-checklist.md](/Users/getnetbelay/Documents/Tikur_Abay/docs/go-live-readiness-checklist.md)
- Soft launch plan: [soft-launch-plan.md](/Users/getnetbelay/Documents/Tikur_Abay/docs/soft-launch-plan.md)
- Daily review checklist: [daily-operations-review-checklist.md](/Users/getnetbelay/Documents/Tikur_Abay/docs/daily-operations-review-checklist.md)
- Weekly improvement workflow: [weekly-improvement-workflow.md](/Users/getnetbelay/Documents/Tikur_Abay/docs/weekly-improvement-workflow.md)
- Full rollout checklist: [full-rollout-checklist.md](/Users/getnetbelay/Documents/Tikur_Abay/docs/full-rollout-checklist.md)
- Production readiness: [production-readiness-checklist.md](/Users/getnetbelay/Documents/Tikur_Abay/docs/production-readiness-checklist.md)
