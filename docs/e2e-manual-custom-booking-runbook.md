# Custom Manual E2E Runbook

This runbook is the corrected version of the manual "create a fresh booking and drive it end to end" flow for the current Tikur Abay repo.

It is different from the seeded scenario runbook in [e2e-manual-test-runbook.md](/Users/getnetbelay/Documents/Tikur_Abay/docs/e2e-manual-test-runbook.md). Use this one only if you want to create a brand-new booking manually.

Use this as the canonical manual E2E runbook for a fresh booking. If this document and any older manual E2E notes disagree, follow this one.

## Environment

- Admin console: `http://127.0.0.1:6010`
- Customer portal: `http://127.0.0.1:6011`
- Backend API: `http://127.0.0.1:6012/api/v1`

## Preparation

Required preflight before the manual run:

```bash
pnpm status:local
pnpm prod:verify
pnpm e2e:critical
```

Do not start the manual E2E if any of those commands fail.

Then prepare the local data and services:

Run before testing:

```bash
pnpm seed:local
pnpm --filter @tikur-abay/admin dev
./scripts/run-with-local-env.sh pnpm --filter @tikur-abay/backend start
```

Recommended reset before a rerun of the same scenario:

```bash
pnpm demo:reset
pnpm seed:local
```

## Test Accounts

All seeded passwords: `ChangeMe123!`

- Admin: `superadmin@tikurabay.com`
- Supplier Agent: `supplier.agent@tikurabay.com`
- Djibouti Release: `djibouti.release@tikurabay.com`
- Clearance: `clearance.agent@tikurabay.com`
- Dispatch: `dispatch.agent@tikurabay.com`
- Yard: `yard.agent@tikurabay.com`
- Customer Portal: `customer1@tikurabay.com`

Driver mobile:

- Phone: `+251900000015`
- PIN: `2112`

## Sample Files

Use these upload files:

- `docs/e2e-samples/commercial-invoice-sample.pdf`
- `docs/e2e-samples/packing-list-sample.pdf`
- `docs/e2e-samples/bl-draft-sample.pdf`
- `docs/e2e-samples/final-bl-sample.pdf`
- `docs/e2e-samples/transit-customs-doc-sample.pdf`
- `docs/e2e-samples/stuffing-photo-sample.svg`
- `docs/e2e-samples/seal-photo-sample.svg`

## Required Evidence

Capture evidence as you go. At minimum keep:

- `QT-...`, `BK-...`, and `SHP-...`
- one screenshot for each major desk transition
- BL/manifest/download file names where generated
- any blocking error text exactly as shown
- final executive journey screenshot showing closed shipment and closed container lifecycle

Recommended evidence points:

- booking created
- supplier handoff completed
- SI approved
- BL finalized
- manifest generated
- finance settled
- Djibouti release handed off
- clearance released to dispatch
- dispatch departed
- yard cycle closed
- empty return confirmed

## 1. Booking / Quote

Open:

- `http://127.0.0.1:6010/shipments/intake?mode=booking`

Login:

- `superadmin@tikurabay.com`
- `ChangeMe123!`

Fill the booking with your shipment data. For the current UI and tests, the validated actions are:

- `Generate Final Quote`
- `Customer agreed by email`
- `Confirm Booking`

Write down:

- Quote number: `QT-...`
- Booking number: `BK-...`
- Shipment number: `SHP-...`

## 2. Supplier Agent / China Desk

Open:

- `http://127.0.0.1:6010/operations/supplier-agent`

Login:

- `supplier.agent@tikurabay.com`
- `ChangeMe123!`

Search:

- `<BK-NUMBER>`

Upload:

- sample documents from `docs/e2e-samples`

Container and stuffing:

- Container number: `MSCU3344556`
- Seal number: `SL-260322-001`
- Stuffing date/time: `2026-03-22 12:15`
- Stuffing location: `Shanghai export yard`
- Loaded by: `Origin loading team`

Ocean handoff:

- Carrier: `MSC`
- Vessel: `MSC Blue Nile`
- Voyage: `VOY-260322-001`
- ETD: `2026-03-23 10:00`
- ETA Djibouti: `2026-03-30 16:00`

Complete origin steps using the current desk actions:

- `Save container details`
- `Confirm stuffing`
- `Confirm gate-in`
- `Save vessel handoff details`
- `Mark ready for vessel handoff`

## 3. Shipping Instruction

Open:

- `http://127.0.0.1:6010/shipping/instructions`

Login:

- `superadmin@tikurabay.com`
- `ChangeMe123!`

Search:

- `<BK-NUMBER>`

Check and fill:

- shipper
- consignee
- notify party
- cargo description
- container number
- seal number
- gross weight
- measurement
- HS code
- place of receipt
- place of delivery
- TIN
- area code
- LC / bank permit

Current valid actions:

- `Save SI draft`
- `Submit shipping instruction`
- `Approve shipping instruction`

## 4. Bills of Lading

Open:

- `http://127.0.0.1:6010/shipping/bills-of-lading`

Search:

- `<BK-NUMBER>`

Check and fill:

- House BL
- Master BL
- Slot carrier bill no
- Carrier
- Vessel
- Voyage
- Freight term
- Place of issue
- Shipped on board date

Current valid actions:

- `Approve Carrier BL and House BL draft`
- `Finalize House BL and Master BL`

Then test:

- `Print Original BL`
- `Print 3 Originals`
- `Print Copy`
- `Verify BL`

Evidence to capture:

- House BL number
- Master BL number
- one exported BL file name

## 5. Manifest

Open:

- `http://127.0.0.1:6010/shipping/manifest`

Search:

- `<BK-NUMBER>`

Click:

- `Generate voyage manifest`

Expected:

- manifest is generated for the selected voyage

Evidence to capture:

- manifest number
- screenshot showing generation complete

## 6. Shipping Finance / LC

Open:

- `http://127.0.0.1:6010/shipping/finance`

Search:

- `<BK-NUMBER>`

Check invoice lines:

- Sea Freight
- Djibouti Clearance
- Inland Transport

Current valid actions:

- `Verify LC and bank packet`
- `Mark LC paid`
- `Record USD payment`
- `Record ETB payment`

## 7. Djibouti Release

Open:

- `http://127.0.0.1:6010/operations/djibouti-release`

Login:

- `djibouti.release@tikurabay.com`
- `ChangeMe123!`

Search:

- `<BK-NUMBER>`

Current valid order:

- `Confirm vessel arrived`
- `Confirm discharge`
- `Confirm line release`
- `Mark customs cleared`
- `Mark gate-out ready`
- `Mark transit packet complete`
- `Send to transitor / clearance`

## 8. Transitor / Clearance

Open:

- `http://127.0.0.1:6010/operations/transitor-clearance`

Login:

- `clearance.agent@tikurabay.com`
- `ChangeMe123!`

Search:

- `<BK-NUMBER>`

Current valid actions:

- `Assign transitor`
- `Prepare T1`
- `Mark charges paid`
- `Release to dispatch`

## 9. Dispatch

Open:

- `http://127.0.0.1:6010/operations/corridor-dispatch`

Login:

- `dispatch.agent@tikurabay.com`
- `ChangeMe123!`

Search:

- `<BK-NUMBER>`

Current valid order:

- `Assign truck`
- `Assign driver`
- `Push pack to driver mobile`
- `Confirm departure`
- `Confirm arrived inland`
- `Send arrival notice`
- `Confirm unload contact`
- `Push to Dry-Port / Yard Desk`
- `Open Dry-Port / Yard Desk`



## 13. Driver Mobile

Login:

- phone: `+251900000015`
- PIN: `2112`

Verify:

- assigned trip visible
- transit pack visible
- booking, BL, container, seal, route, and documents visible

Submit checkpoints if the mobile flow is active in your environment:

- PK12 corridor exit
- Ali Sabieh weighbridge
- Galafi border checkpoint
- Awash checkpoint
- Adama Dry Port gate

## 14. Yard / Delivery

Open:

- `http://127.0.0.1:6010/operations/dry-port-yard`

Login:

- `yard.agent@tikurabay.com`
- `ChangeMe123!`

Search:

- `<BK-NUMBER>`

Fill receipt:

- Consignee rep: `Solomon Bekele`
- Company: `Alem Logistics PLC`
- Contact: `+251 900 000 215`
- Note: `Received clean with no shortage or damage.`

Current valid order:

- `Confirm inland arrival`
- `Confirm gate-in`
- `Start unload`
- `Complete unload`
- `Mark ready for pickup`

go back to superadmin@tikurabay.com finace tab and release .... http://127.0.0.1:6010/shipping/finance

- `Prepare POD`
- `Capture signature`
- `Upload POD`
- `Upload receiving photo`
- `Mark goods received`
- `Mark empty released`
- `Start empty return`
- `Confirm empty returned`
- `Upload return receipt`
- `Close shipment cycle`
- `Send thank-you message`

## 15. Executive Verify

Open:

- `http://127.0.0.1:6010/?tab=journey`

Search:

- `<BK-NUMBER>`

Check:

- shipment visible
- final stage visible
- no stale blockers

## 16. Customer Verify

Open customer portal:

- `http://127.0.0.1:6011`

Login:

- `customer1@tikurabay.com`
- `ChangeMe123!`

Open:

- `http://127.0.0.1:6011/shipments`

Check:

- shipment visible
- customer shipment status updated
- documents visible if uploaded
- POD visibility is correct

## Pass Conditions

- quote created
- booking created
- supplier origin handoff completed
- SI approved
- BL finalized
- manifest generated
- LC and payment recorded
- Djibouti release completed
- clearance released to dispatch
- dispatch departed and handed off to yard
- tracking API responds
- public tracking updates
- yard closes the cycle
- customer portal shows the shipment state correctly
