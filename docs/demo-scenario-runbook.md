# Demo Scenario Runbook

## Load command

Run:

```bash
pnpm demo:load
```

Optional commands:

```bash
pnpm demo:verify
pnpm demo:reset
```

## Demo accounts

- `supplier.agent@tikurabay.com` / `ChangeMe123!`
- `djibouti.release@tikurabay.com` / `ChangeMe123!`
- `clearance.agent@tikurabay.com` / `ChangeMe123!`
- `dispatch.agent@tikurabay.com` / `ChangeMe123!`
- `yard.agent@tikurabay.com` / `ChangeMe123!`
- `customer1@tikurabay.com` / `ChangeMe123!`
- `customer2@tikurabay.com` / `ChangeMe123!`
- Driver phone: `+251900000015`
- Driver PIN: `2112`

## Scenario IDs

- Scenario A Happy Path: `TB-DEMO-0001`, `SHP-DEMO-0001`, `BL-DJI-DEMO-0001`, `MSCU1111111`, `SL-111111`, `TRP-DEMO-0001`
- Scenario B Customer Issue: `TB-DEMO-0002`, `SHP-DEMO-0002`, `BL-DJI-DEMO-0002`, `MSCU2222222`, `SL-222222`, `TRP-DEMO-0002`
- Scenario C Clearance Risk: `TB-DEMO-0003`, `SHP-DEMO-0003`, `BL-DJI-DEMO-0003`, `MSCU3333333`, `SL-333333`

## URLs

- Admin console: `http://127.0.0.1:6010`
- Booking desk: `http://127.0.0.1:6010/booking`
- Booking / Quote desk: `http://127.0.0.1:6010/operations/booking-quote`
- China Port Agent desk: `http://127.0.0.1:6010/operations/supplier-agent`
- Djibouti Release desk: `http://127.0.0.1:6010/operations/djibouti-release`
- Clearance desk: `http://127.0.0.1:6010/operations/clearance`
- Dispatch desk: `http://127.0.0.1:6010/operations/corridor-dispatch`
- Dry Port / Yard desk: `http://127.0.0.1:6010/operations/dry-port-yard`
- Empty return desk: `http://127.0.0.1:6010/operations/empty-return`
- Executive dashboard: `http://127.0.0.1:6010/dashboards/executive`
- Customer portal home: `http://127.0.0.1:6011`
- Customer portal bookings: `http://127.0.0.1:6011/bookings`
- Customer portal shipments: `http://127.0.0.1:6011/shipments`
- Customer portal documents: `http://127.0.0.1:6011/documents`

## Recommended walkthrough

1. Run `pnpm demo:load`
2. Open the executive dashboard and confirm the demo records appear in the workflow mix
3. Open the China Port Agent desk and review Scenario A origin completion
4. Open the Djibouti Release desk and review Scenario C risk and blocked handoff
5. Open the Clearance desk and confirm Scenario C is still blocked from dispatch
6. Open the Dispatch desk and verify Scenario B trip visibility
7. Log into the driver app and confirm `TRP-DEMO-0002` is visible with BL, T1, container, seal, item summary, and checkpoint state
8. Log into customer portal as `customer1@tikurabay.com` and review Scenario A and Scenario C
9. Log into customer portal as `customer2@tikurabay.com` and review the Scenario B issue state and POD visibility
10. Verify empty return and closure behavior across Scenario A and Scenario B

## Expected scenario outcomes

- Scenario A: fully closed shipment, clean receipt, full container lifecycle completed, return receipt linked
- Scenario B: customer issue remains open, POD exists, empty return is still active, closure remains blocked
- Scenario C: release file is present but clearance is not ready, risk is visible, dispatch must remain blocked

## Role expectations

- China Port Agent sees all three records with origin ownership history and origin file references
- Djibouti Release sees multimodal readiness, release note state, and Scenario C risk visibility
- Clearance agent sees Scenario C as the active blocked file and Scenario A/B as completed or handed off
- Dispatch sees trip-ready records and can validate that Scenario C is blocked
- Yard sees delivered and empty-return-sensitive records
- `customer1@tikurabay.com` sees Scenario A and Scenario C only
- `customer2@tikurabay.com` sees Scenario B only
- Driver sees the active demo trip assignment for Scenario B
