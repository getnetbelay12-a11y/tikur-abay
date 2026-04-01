# Tikur Abay Production Go / No-Go Checklist

Use this checklist for the final production launch decision. `Go` means every blocking item is complete with evidence. Any unresolved blocking item means `No-Go`.

## Decision Rule

- `Go`: all blocking items complete and verified
- `No-Go`: any blocking item incomplete, unverified, or failed

## Blocking Items

| Area | Item | Owner | Status | Evidence Required |
| --- | --- | --- | --- | --- |
| Access | Production roles and branch permissions verified | Super Admin | Open | Permission audit result for all live roles and branches |
| Launch Control | Launch Center edit access limited to approved roles | Super Admin | Open | Screenshot or walkthrough of `/settings/launch` and `/settings/launch/report` with role checks |
| Infrastructure | Production secrets rotated | Engineering | Open | Secret rotation log and deployment confirmation |
| Infrastructure | Backup and restore drill completed | Engineering | Open | Restore test result with timestamp and restored sample records |
| Monitoring | Monitoring and error tracking active | Engineering | Open | Live monitoring dashboard and error-tracking project confirmation |
| Database | MongoDB Atlas access, indexes, and production connectivity verified | Engineering | Open | Atlas network/config check and query/index verification |
| Payments | Real payment flow verified end to end | Finance + Engineering | Open | Successful live or sandbox payment proof and receipt visibility |
| Agreements | Signing flow and signed PDF retrieval verified | Commercial + Engineering | Open | Signed agreement test and downloadable signed PDF proof |
| Documents | Real upload/download flow verified for documents, receipts, POD, and KYC | Operations + Engineering | Open | Upload/download evidence for each document class |
| Operations | Delayed trips, blocked vehicles, overdue maintenance, and fuel logging workflows verified | Operations Manager | Open | Pilot rehearsal results from Operations Hub |
| HR / Compliance | Driver KYC and expiry workflows verified | HR | Open | Approved/rejected KYC flow evidence and expiry alert review |
| QA | Full cross-role UAT completed | Program Lead | Open | Completed UAT checklist set and issue disposition |
| Rollback | Launch-week rollback procedure approved | Engineering + Executive Sponsor | Open | Written rollback plan and responsible owner confirmation |
| Support | Pilot and launch support escalation owner confirmed | Program Lead | Open | Support roster with phone/email/escalation path |

## Non-Blocking But Recommended

| Area | Item | Owner | Status | Evidence Required |
| --- | --- | --- | --- | --- |
| Reporting | Launch report export reviewed by leadership | Executive Sponsor | Open | Review sign-off |
| Performance | Production route smoke and response check completed | Engineering | Open | Route smoke output and timing summary |
| Mobile | Final mobile verification pass completed | Mobile Lead | Open | Driver and customer mobile validation notes |
| Training | Final role-based refresher completed | Program Lead | Open | Attendance and training confirmation |

## Final Meeting Template

### Go / No-Go Review

- Date:
- Decision:
- Chair:
- Engineering owner:
- Operations owner:
- Finance owner:
- HR owner:
- Commercial owner:
- Support owner:

### Open blockers

- Blocker:
- Impact:
- Owner:
- ETA:

### If `Go`

- Confirm launch window
- Confirm support coverage
- Confirm monitoring watch window
- Confirm daily review meeting time

### If `No-Go`

- Confirm blocking items
- Confirm corrective owners
- Confirm next review date
