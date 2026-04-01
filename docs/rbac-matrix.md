# RBAC Permissions Matrix

| Role | Modules | Key Permissions |
| --- | --- | --- |
| `super_admin` | all | full platform access, audit log view, role management |
| `operations_manager` | operations, chat, documents | create trips, assign vehicles, update trip status, view live map |
| `dispatcher` | operations, chat | dispatch workflow, checkpoint updates, delay/breakdown escalation |
| `technical_manager` | maintenance, documents | manage maintenance plans, repair orders, spare parts, and vehicle assignment blocks |
| `workshop_officer` | maintenance | update repair orders, record service completion, and consume parts |
| `marketing_officer` | marketing, agreements | manage quotes, agreements, customer pipeline, and available vehicle visibility |
| `finance_officer` | finance, reports | manage invoices, payments, salaries, commissions, and finance reporting |
| `hr_officer` | hr, documents | employee and driver records, performance reviews, HR documents |
| `branch_manager` | branch operations | branch dashboard, trips, vehicles, drivers, and employee visibility |
| `executive` | management | executive dashboards, reports, branch performance, audit visibility |
| `driver` | driver app, chat, documents | view assigned trip, send location, upload POD, chat with dispatcher |
| `customer` | customer portal, documents, support | view quotes, agreements, shipments, invoices, upload documents, support chat |
