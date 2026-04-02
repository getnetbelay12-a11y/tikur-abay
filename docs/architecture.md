# Architecture Diagram

```mermaid
flowchart TD
  Driver[Flutter Driver App]
  Customer[Customer Portal Later]
  Admin[Next.js Admin Dashboard]
  API[NestJS Backend API]
  WS[Socket.IO Gateway]
  Mongo[(MongoDB)]
  S3[(S3-Compatible Storage)]
  GPS[GPS Provider Adapter]
  Integrations[Webhook / Integration References]

  Driver --> API
  Driver --> WS
  Admin --> API
  Admin --> WS
  Customer --> API
  API --> Mongo
  API --> S3
  API --> GPS
  Integrations --> API
```

## Backend Modules

- Auth and RBAC
- Branches
- Customers
- Drivers
- Vehicles and Trailers
- Jobs and Shipments
- Dispatch
- Documents
- Agreements
- Tracking
- Incidents
- Notifications
- Dashboards
- Compliance
- Integrations
- Audit

