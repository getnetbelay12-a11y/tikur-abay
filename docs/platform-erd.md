# Platform ERD

This document captures the full MongoDB collection model for the Tikur Abay Transport Business Management Platform.

## Core collections

- `users`: login accounts linked to `roles`, `branches`, and optionally `employees`, `drivers`, or `customers`
- `roles`: permission bundles such as `super_admin`, `operations_manager`, `dispatcher`, `technical_manager`, `finance_officer`, `driver`, `customer`
- `branches`: operational offices linked to users, employees, drivers, vehicles, and trips
- `employees`: HR master records for staff
- `drivers`: driver-specific profile, license, emergency, and performance data
- `customers`: company or individual customer records
- `vehicles`: truck and fleet unit master data including live operational status
- `trailers`: optional trailer inventory
- `trips`: core transport job records
- `trip_events`: timeline log for trip activity
- `gps_points`: GPS history from app, device, or manual source
- `maintenance_plans`: recurring service rules by km and days
- `maintenance_records`: completed technical work entries
- `spare_parts`: inventory of workshop parts
- `spare_part_usage`: part consumption tracking
- `repair_orders`: workshop job tickets
- `quotes`: customer quotations
- `agreements`: contract workflow and signed versions
- `invoices`: customer billing
- `payments`: customer receipts and payroll-support records
- `salaries`: employee salary records
- `commissions`: driver and staff commissions
- `documents`: central entity-linked document metadata
- `chat_rooms`: internal, trip, customer support, and vehicle channels
- `chat_messages`: room messages
- `notifications`: in-app, SMS, or email alerts
- `performance_reviews`: performance records for drivers and employees
- `audit_logs`: system audit trail for major changes

## Relationship summary

- one `branch` -> many `users`, `employees`, `drivers`, `vehicles`, `trips`
- one `customer` -> many `quotes`, `agreements`, `trips`, `invoices`, `documents`
- one `vehicle` -> many `trips`, `gps_points`, `maintenance_plans`, `maintenance_records`, `documents`
- one `driver` -> many `trips`, `documents`, `performance_reviews`
- one `trip` -> many `trip_events`, `gps_points`, `documents`, `chat_rooms`, `commissions`
- one `invoice` -> many `payments`
- one `chat_room` -> many `chat_messages`

## Business rules

- one vehicle can only have one active trip at a time
- maintenance alert should block assignment when critical service is overdue
- delivered trip must include proof of delivery before closing
- every payment must be linked to a customer and invoice if applicable
- salary and commission must be auditable
- every major status change must be stored in audit logs
- documents must support expiry dates and approval status
- agreements must keep version history

Reference implementation detail lives in [schema-catalog.ts](/Users/getnetbelay/Documents/Tikur_Abay/apps/backend/src/database/schemas/schema-catalog.ts).
