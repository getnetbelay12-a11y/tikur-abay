# Platform API Catalog

Base prefix: `/api/v1`

## Auth

- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh-token`
- `GET /auth/me`
- `POST /auth/change-password`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

## Roles and permissions

- `GET /roles`
- `POST /roles`
- `GET /roles/:id`
- `PATCH /roles/:id`
- `DELETE /roles/:id`

## Users

- `GET /users`
- `POST /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `PATCH /users/:id/status`
- `DELETE /users/:id`

## Branches

- `GET /branches`
- `POST /branches`
- `GET /branches/:id`
- `PATCH /branches/:id`
- `DELETE /branches/:id`

## Employees

- `GET /employees`
- `POST /employees`
- `GET /employees/:id`
- `PATCH /employees/:id`
- `PATCH /employees/:id/status`
- `GET /employees/:id/documents`
- `GET /employees/:id/performance`
- `GET /employees/:id/salaries`

## Drivers

- `GET /drivers`
- `POST /drivers`
- `GET /drivers/:id`
- `PATCH /drivers/:id`
- `PATCH /drivers/:id/status`
- `GET /drivers/:id/trips`
- `GET /drivers/:id/performance`
- `GET /drivers/:id/documents`
- `GET /drivers/:id/license-alerts`

## Customers

- `GET /customers`
- `POST /customers`
- `GET /customers/:id`
- `PATCH /customers/:id`
- `PATCH /customers/:id/status`
- `GET /customers/:id/agreements`
- `GET /customers/:id/quotes`
- `GET /customers/:id/trips`
- `GET /customers/:id/invoices`
- `GET /customers/:id/documents`

## Vehicles

- `GET /vehicles`
- `POST /vehicles`
- `GET /vehicles/:id`
- `PATCH /vehicles/:id`
- `PATCH /vehicles/:id/status`
- `GET /vehicles/:id/gps`
- `GET /vehicles/:id/trips`
- `GET /vehicles/:id/maintenance-plans`
- `GET /vehicles/:id/maintenance-records`
- `GET /vehicles/:id/documents`
- `GET /vehicles/:id/location-history`
- `POST /vehicles/:id/assign-branch`

## Trailers

- `GET /trailers`
- `POST /trailers`
- `GET /trailers/:id`
- `PATCH /trailers/:id`
- `PATCH /trailers/:id/status`

## Trips

- `GET /trips`
- `POST /trips`
- `GET /trips/:id`
- `PATCH /trips/:id`
- `PATCH /trips/:id/status`
- `POST /trips/:id/assign-driver`
- `POST /trips/:id/assign-vehicle`
- `POST /trips/:id/start`
- `POST /trips/:id/load`
- `POST /trips/:id/offload`
- `POST /trips/:id/mark-delivered`
- `POST /trips/:id/complete`
- `POST /trips/:id/report-delay`
- `POST /trips/:id/report-breakdown`
- `GET /trips/:id/events`
- `POST /trips/:id/events`
- `GET /trips/:id/documents`
- `GET /trips/:id/chat-room`
- `GET /trips/:id/route-history`
- `GET /trips/:id/proof-of-delivery`

## Tracking

- `POST /tracking/gps-points`
- `GET /tracking/live-map`
- `GET /tracking/vehicles/:vehicleId/live`
- `GET /tracking/trips/:tripId/live`
- `GET /tracking/trips/:tripId/history`
- `GET /tracking/vehicles/offline`
- `GET /tracking/alerts`

## Maintenance plans

- `GET /maintenance-plans`
- `POST /maintenance-plans`
- `GET /maintenance-plans/:id`
- `PATCH /maintenance-plans/:id`
- `DELETE /maintenance-plans/:id`
- `GET /maintenance-plans/due-soon`
- `GET /maintenance-plans/overdue`

## Maintenance records

- `GET /maintenance-records`
- `POST /maintenance-records`
- `GET /maintenance-records/:id`
- `PATCH /maintenance-records/:id`
- `GET /maintenance-records/:id/documents`

## Spare parts

- `GET /spare-parts`
- `POST /spare-parts`
- `GET /spare-parts/:id`
- `PATCH /spare-parts/:id`
- `PATCH /spare-parts/:id/stock`
- `GET /spare-parts/low-stock`
- `GET /spare-parts/:id/usage-history`

## Repair orders

- `GET /repair-orders`
- `POST /repair-orders`
- `GET /repair-orders/:id`
- `PATCH /repair-orders/:id`
- `PATCH /repair-orders/:id/status`
- `POST /repair-orders/:id/close`

## Quotes

- `GET /quotes`
- `POST /quotes`
- `GET /quotes/:id`
- `PATCH /quotes/:id`
- `PATCH /quotes/:id/status`
- `POST /quotes/:id/convert-to-agreement`
- `POST /quotes/:id/convert-to-trip`

## Agreements

- `GET /agreements`
- `POST /agreements`
- `GET /agreements/:id`
- `PATCH /agreements/:id`
- `PATCH /agreements/:id/status`
- `POST /agreements/:id/send-to-customer`
- `POST /agreements/:id/approve`
- `POST /agreements/:id/sign`
- `POST /agreements/:id/renew`
- `GET /agreements/:id/versions`
- `GET /agreements/:id/document`
- `GET /agreements/expiring-soon`

## Invoices

- `GET /invoices`
- `POST /invoices`
- `GET /invoices/:id`
- `PATCH /invoices/:id`
- `PATCH /invoices/:id/status`
- `POST /invoices/:id/send`
- `GET /invoices/overdue`
- `GET /invoices/:id/payments`

## Payments

- `GET /payments`
- `POST /payments`
- `GET /payments/:id`
- `PATCH /payments/:id`
- `PATCH /payments/:id/status`
- `GET /payments/customer-receipts`
- `GET /payments/salary-payments`
- `GET /payments/commission-payments`

## Salaries

- `GET /salaries`
- `POST /salaries`
- `GET /salaries/:id`
- `PATCH /salaries/:id`
- `POST /salaries/:id/process`
- `POST /salaries/:id/mark-paid`

## Commissions

- `GET /commissions`
- `POST /commissions`
- `GET /commissions/:id`
- `PATCH /commissions/:id`
- `POST /commissions/:id/approve`
- `POST /commissions/:id/mark-paid`

## Documents

- `GET /documents`
- `POST /documents/upload`
- `GET /documents/:id`
- `PATCH /documents/:id`
- `PATCH /documents/:id/approve`
- `PATCH /documents/:id/reject`
- `DELETE /documents/:id`
- `GET /documents/expiring-soon`
- `GET /documents/by-entity/:entityType/:entityId`

## Chat

- `GET /chat/rooms`
- `POST /chat/rooms`
- `GET /chat/rooms/:id`
- `PATCH /chat/rooms/:id`
- `GET /chat/rooms/:id/messages`
- `POST /chat/rooms/:id/messages`
- `PATCH /chat/messages/:id/seen`
- `POST /chat/rooms/:id/participants`

## Notifications

- `GET /notifications`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`
- `GET /notifications/unread-count`

## Driver reports

- `POST /driver-reports`
- `GET /driver-reports`
- `GET /driver-reports/:id`
- `PATCH /driver-reports/:id/status`

## Maintenance notifications

- `POST /maintenance-notifications`
- `GET /maintenance-notifications`
- `PATCH /maintenance-notifications/:id/read`

## Performance

- `GET /performance/drivers`
- `GET /performance/employees`
- `POST /performance-reviews`
- `GET /performance-reviews/:id`
- `PATCH /performance-reviews/:id`

## Dashboards

- `GET /dashboards/operations/summary`
- `GET /dashboards/operations/live-fleet`
- `GET /dashboards/operations/delayed-trips`
- `GET /dashboards/operations/djibouti-trips`
- `GET /dashboards/technical/summary`
- `GET /dashboards/technical/maintenance-due`
- `GET /dashboards/technical/low-stock-parts`
- `GET /dashboards/marketing/summary`
- `GET /dashboards/marketing/available-vehicles`
- `GET /dashboards/marketing/pipeline`
- `GET /dashboards/finance/summary`
- `GET /dashboards/finance/outstanding-invoices`
- `GET /dashboards/finance/revenue-by-route`
- `GET /dashboards/finance/profit-by-vehicle`
- `GET /dashboards/management/executive-summary`
- `GET /dashboards/management/fleet-utilization`
- `GET /dashboards/management/driver-performance`
- `GET /dashboards/management/branch-performance`

## Audit logs

- `GET /audit-logs`
- `GET /audit-logs/:entityType/:entityId`
