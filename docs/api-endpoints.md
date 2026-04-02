# API Endpoints

## Auth

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

## Branches

- `GET /branches`
- `POST /branches`
- `PATCH /branches/:id`

## Customers

- `GET /customers`
- `POST /customers`
- `GET /customers/:id`

## Drivers

- `GET /drivers`
- `POST /drivers`
- `GET /drivers/:id/assigned-trips`

## Vehicles and Trailers

- `GET /vehicles`
- `POST /vehicles`
- `GET /trailers`
- `POST /trailers`

## Jobs and Shipments

- `GET /jobs`
- `POST /jobs`
- `GET /shipments`
- `POST /shipments`
- `PATCH /shipments/:id/status`

## Dispatch

- `POST /dispatch/assign`
- `POST /dispatch/start-loading`
- `POST /dispatch/start-trip`

## Documents

- `GET /shipments/:id/documents`
- `POST /shipments/:id/documents`
- `PATCH /documents/:id/approve`
- `GET /documents/:id/download-url`

## Agreements

- `GET /agreements`
- `POST /agreements`
- `POST /agreements/:id/send`
- `POST /agreements/:id/sign`

## Tracking

- `POST /tracking/pings`
- `GET /tracking/trips/:tripId/live`
- `POST /tracking/provider-webhook`

## Incidents

- `POST /incidents`
- `GET /incidents`

## Dashboard

- `GET /dashboard/operations`
- `GET /dashboard/management`

