# Tikur Abay E2E Manual Test Runbook

## Purpose
Use this runbook to validate the full cargo journey in the current Tikur Abay platform:

1. Supplier / China origin
2. Stuffing / gate-in
3. Ocean transit
4. Djibouti release
5. Truck dispatch and checkpoint tracking
6. Inland arrival / unload
7. Customer receipt confirmation
8. Empty return
9. Shipment closure or issue hold

This runbook matches the current admin console, customer portal, mobile app, backend APIs, and seeded E2E scenario data.

## Environment
- Admin console: `http://127.0.0.1:6010`
- Customer portal: `http://127.0.0.1:6011`
- Backend API: `http://127.0.0.1:6012/api/v1`
- Mobile app: `apps/driver`

## Preparation Commands
Run these in order:

```bash
pnpm seed:local
pnpm e2e:prepare-demo
pnpm --filter @tikur-abay/backend build
./scripts/run-with-local-env.sh pnpm --filter @tikur-abay/backend start
pnpm status:local
```

Optional automated validation:

```bash
pnpm e2e:verify-demo
```

Artifacts written by the scenario tooling:
- `reports/e2e-manual-demo-manifest.json`
- `reports/e2e-cargo-journey-summary.json`

## Test Accounts
All seeded passwords: `ChangeMe123!`

Console / portal accounts:
- Supplier Agent: `supplier.agent@tikurabay.com`
- Djibouti Release Agent: `djibouti.release@tikurabay.com`
- Dispatch Agent: `dispatch.agent@tikurabay.com`
- Yard Agent: `yard.agent@tikurabay.com`
- Finance / Customs: `finance.customs@tikurabay.com`
- Support Agent: `support.agent@tikurabay.com`
- Customer User: `customer1@tikurabay.com`

Mobile driver:
- Driver email reference: `driver.demo@tikurabay.com`
- Driver phone: `+251900000015`
- Driver PIN: `2112`

## E2E Scenario Shipments
### Scenario A: Clean Success
- Booking: `TB-E2E-0001`
- Shipment: `SHP-E2E-0001`
- Trip: `TRP-E2E-0001`
- Container: `MSCU1234567`
- Seal: `SL-908877`
- BL: `BL-DJI-0001`
- Inland destination: `Adama Dry Port`
- Final delivery: `Alem Logistics PLC · Adama Customer Delivery`

### Scenario B: Exception Flow
- Booking: `TB-E2E-0002`
- Shipment: `SHP-E2E-0002`
- Trip: `TRP-E2E-0002`
- Container: `MSCU7654321`
- Seal: `SL-445566`
- BL: `BL-DJI-0002`
- Inland destination: `Combolcha Dry Port`
- Final delivery: `Alem Logistics PLC · Combolcha Customer Delivery`

## Manual Run Order
1. Supplier Agent
2. Djibouti Release Agent
3. Dispatch Agent
4. Driver Mobile
5. Yard / Dry-Port Agent
6. Customer Portal / Customer Mobile
7. Empty Return Closure

## Step-By-Step Validation
### 1. Supplier Agent
Open:
- Admin console
- `Supplier Agent Desk`

Verify for `TB-E2E-0001` and `TB-E2E-0002`:
- booking summary visible
- 5 cargo lines visible
- invoice, packing list, BL draft/final visible
- container and seal present
- stuffing confirmed
- gate-in confirmed
- vessel / ETD / ETA visible
- shipment ready for ocean handoff

Expected:
- stage shows `Ocean Transit`
- no missing required origin fields
- Djibouti desk can find the shipment

### 2. Djibouti Release Agent
Open:
- `Djibouti Release Desk`

Verify:
- vessel arrival visible
- discharge confirmed
- transit/customs doc linked
- release note linked
- free-time start and end visible
- demurrage/storage risk chip visible
- line release, customs cleared, gate-out ready complete

Expected:
- shipment becomes dispatch-ready
- dispatch queue can pick it up

### 3. Dispatch Agent
Open:
- `Corridor Dispatch`

Verify:
- trip created for each shipment
- truck and driver assigned
- route and ETA visible
- transit pack pushed
- departed / in-transit state visible

Expected:
- driver mobile shows assigned trip
- live checkpoint timeline updates later appear here

### 4. Driver Mobile
Open:
- mobile app
- role: `Driver`
- phone: `+251900000015`
- PIN: `2112`

Verify:
- assigned trip opens
- Transit Pack shows booking, BL, container, seal, route, item count, docs
- checkpoint updates submit correctly
- issue report can be submitted on Scenario B
- arrival confirmation works

Expected:
- dispatch timeline updates
- wrong shipments are not visible

### 5. Yard / Dry-Port Agent
Open:
- `Dry-Port Yard Desk`

Verify:
- inland arrival confirmed
- unload started/completed
- storage assigned
- POD uploaded / captured
- customer confirmation stage becomes active

Expected:
- customer portal shows delivery-stage progress

### 6. Customer Portal / Customer Mobile
Open:
- customer portal
- `Shipments`
- shipment detail for the scenario

Verify:
- cargo items
- documents
- customs/tax summary
- timeline
- POD visibility
- customer confirmation action

Scenario A expected:
- customer confirms `received clean`
- shipment moves to `Empty Return`

Scenario B expected:
- customer confirms `received with damage`
- shipment remains closure-blocked
- issue summary remains visible

### 7. Empty Return Closure
Verify:
- empty released
- empty return started
- empty returned
- return receipt uploaded

Scenario A expected:
- shipment closes

Scenario B expected:
- empty return can complete
- shipment does **not** close because the customer issue remains under review

## Realtime Cross-System Checks
During the run verify:
- supplier updates appear in Djibouti queue
- Djibouti updates appear in dispatch
- dispatch trip appears in driver mobile
- driver checkpoints appear in console timeline
- yard unload and POD appear in customer portal timeline
- customer confirmation updates shipment closure state
- empty return updates final stage everywhere

## Risk Control Checks
Verify these fields in the E2E scenarios:
- `freeTimeStart`
- `freeTimeEnd`
- Djibouti storage / demurrage risk chip
- dry-port collection / storage timing visibility
- empty return deadline visibility
- return receipt status

## Pass / Fail Checklist
Mark pass only if all are true:

- Supplier can complete origin file correctly
- Djibouti release can complete and hand off
- Dispatch can create trip and assign driver/truck
- Driver sees the correct transit pack
- Checkpoint updates appear in dispatch timeline
- Yard can confirm arrival, unload, and POD
- Customer can confirm receipt
- POD is visible in portal/mobile
- Empty return can be tracked and completed
- Scenario A closes cleanly
- Scenario B stays blocked from closure until issue resolution
- No `undefined` or broken shipment linkage appears
- Role visibility stays correct

## Troubleshooting
- If seeded role accounts are missing, rerun:
  - `pnpm seed:local`
- If E2E scenarios are missing, rerun:
  - `pnpm e2e:prepare-demo`
- If the API is stale after backend code changes:
  - stop old backend processes
  - rebuild backend
  - restart backend
- If portal or mobile still show old state, refresh after the stage action completes.
