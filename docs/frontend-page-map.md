# Frontend Page Map

This file maps the currently scaffolded routes. For the full product screen inventory, see [platform-screen-inventory.md](/Users/getnetbelay/Documents/Tikur_Abay/docs/platform-screen-inventory.md).

## Admin Web

- `/`: executive summary dashboard
- `/auth/login`: login
- `/users`: users and role mapping
- `/customers`: customer directory and account details
- `/drivers`: drivers, licenses, contracts, emergency contacts
- `/vehicles`: vehicles, statuses, current location, maintenance block state
- `/trips`: dispatch board and trip timeline list
- `/trips/[id]`: trip detail, checkpoints, POD, chat side panel
- `/tracking`: live vehicle map and active trip overlay
- `/maintenance-alerts`: due-by-km and due-by-date alert center
- `/tire-due-list`: vehicles approaching or exceeding tire inspection threshold
- `/driver-reports`: unresolved and recent field reports from drivers
- `/accident-reports`: accident escalation inbox
- `/obstacle-reports`: road obstacle escalation inbox
- `/fuel-requests`: driver fuel request queue
- `/agreements`: agreements, versions, approval workflow
- `/documents`: uploads, approvals, expiry tracking
- `/chat`: trip/customer/internal rooms
- `/payments`: invoices, payments, outstanding balances
- `/hr`: employee basic records and payroll references
- `/notifications`: notification center
- `/audit-logs`: major change history
- `/dashboards/executive`: executive KPI dashboard
- `/booking`: booking / quote desk alias
- `/operations/booking-quote`: unified booking / quote intake and queue
- `/operations/supplier-agent`: Tikur Abay Port Agent Desk (China)
- `/operations/djibouti-release`: Multimodal / Djibouti release desk
- `/operations/clearance`: transitor / clearance alias
- `/operations/transitor-clearance`: transitor / clearance desk
- `/operations/corridor-dispatch`: corridor dispatch and truck transit
- `/operations/dry-port-yard`: dry-port arrival, delivery, POD, and customer confirmation
- `/operations/empty-return`: empty return control to Djibouti closure

Phase 1 scaffold coverage intentionally focuses on MVP routes rather than every full-platform screen.

## Customer Portal

- `/`: portal landing
- `/auth/login`: customer login
- `/dashboard`: active shipments, balances, agreements, notices
- `/bookings`: booking / quote request, review, acceptance, and origin assignment visibility
- `/shipments`: trip list and current shipment status
- `/agreements`: agreement versions and download
- `/documents`: upload legal or shipment documents
- `/payments`: invoice list and payment history
- `/support`: customer support chat

## Driver App

- `LoginScreen`
- `AssignedTripScreen`
- `ReportIssueScreen`
- `ChatScreen`
- `DocumentScreen`
- `NotificationsScreen`
- `ProfileScreen`
