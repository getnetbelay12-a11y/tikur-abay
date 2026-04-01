# Tikur Abay Full E2E Manual Runbook

Deprecated in favor of `docs/e2e-final-manual-runbook.md`. Use the final runbook as the source of truth for current desk order, driver login, and customer email data.

This runbook covers the full manual flow from quote creation through booking, shipping, clearance, dispatch, yard release, and empty return / empty in.

## Start Here

If the tester knows nothing about the system, start with `Start Here: Quick Copy/Paste E2E`.

Use the rest of the document only as support:
- `Final System Flow` explains the big picture
- `Copy/Paste Test Data` gives the full reference data set
- the numbered sections below are the longer desk-by-desk version

## Final System Flow

Use this as the correct end-to-end operational sequence for the system:

```text
1. Customer requests Quote
↓
2. Tikur Abay prepares quote
   - Ocean (USD)
   - Clearance (USD)
   - Truck (ETB)
↓
3. Customer accepts Quote
↓
4. Booking created
↓
5. Origin / Supplier handoff completed
   - cargo items
   - invoice
   - packing list
   - container + seal
   - stuffing
   - gate-in
↓
6. Carrier schedule assigned
↓
7. Shipping Instruction prepared and approved
↓
8. Bill of Lading processed
   - Tikur BL / House BL
   - Carrier BL / Master BL
↓
9. Cargo Manifest generated
↓
10. Djibouti document pack prepared
↓
11. Documents marked ready for clearance
↓
12. Clearance / Transitor completed
↓
13. Bank / LC documents reviewed
↓
14. Tikur Abay issues customer charges
   - sea freight
   - clearance
   - trucking
   - other approved charges
↓
15. Customer pays and uploads receipts
↓
16. Tikur Finance verifies payment
↓
17. Official Tikur receipt issued
↓
18. Financial clearance approved
↓
19. Release authorization sent
   - customer release or dry-port release
   - customs/release docs handed over
↓
20. Cargo released
↓
21. Truck assigned + inland delivery
↓
22. Empty return / empty in recorded
↓
23. Driver uploads expenses
↓
24. Finance reimburses driver
↓
25. Shipment CLOSED
```

Short version:

```text
Quote
↓
Customer approval
↓
Booking
↓
Origin preparation
↓
Shipping docs (SI → BL → Manifest)
↓
Djibouti release
↓
Clearance
↓
Finance settlement / LC / receipts
↓
Cargo release authorization
↓
Dispatch
↓
Dry port release
↓
Empty return
↓
Closed
```

## Scope

Use this runbook to validate:
- quote generation
- customer approval
- booking confirmation
- origin / supplier handoff
- shipping workspace
- Djibouti release
- clearance
- dispatch
- driver mobile sync
- dry-port / yard release
- empty return / empty in
- tracking
- downloadable PDF quality

## Base URLs

```text
Admin Console: http://127.0.0.1:6010
Customer Portal: http://127.0.0.1:6011
Public Tracking: http://127.0.0.1:6010/shipping/track
```

## Console Links

```text
Booking / Quote Desk: http://127.0.0.1:6010/shipments/intake?mode=quote
Booking Confirmation: http://127.0.0.1:6010/shipments/intake?mode=booking
Supplier / Origin Desk: http://127.0.0.1:6010/operations/supplier-agent
Shipping Workspace: http://127.0.0.1:6010/shipping
Carrier Schedules: http://127.0.0.1:6010/shipping/carrier-schedules
Shipping Instructions: http://127.0.0.1:6010/shipping/instructions
Bills of Lading: http://127.0.0.1:6010/shipping/bills-of-lading
Manifest: http://127.0.0.1:6010/shipping/manifest
Shipping Tracking: http://127.0.0.1:6010/shipping/tracking
Shipping Finance: http://127.0.0.1:6010/shipping/finance
After-Sales: http://127.0.0.1:6010/shipping/after-sales
Djibouti Release Desk: http://127.0.0.1:6010/operations/djibouti-release
Clearance / Transitor Desk: http://127.0.0.1:6010/operations/transitor-clearance
Dispatch Desk: http://127.0.0.1:6010/operations/corridor-dispatch
Dry-Port / Yard Desk: http://127.0.0.1:6010/operations/dry-port-yard
Customer Portal: http://127.0.0.1:6011
Public Tracking: http://127.0.0.1:6010/shipping/track
```

## Test Accounts / Passwords

```text
Admin / Super Admin Console: superadmin@tikurabay.com
Supplier Agent: supplier.agent@tikurabay.com
Djibouti Release: djibouti.release@tikurabay.com
Clearance / Transitor: clearance.agent@tikurabay.com
Dispatch: dispatch.agent@tikurabay.com
Dry-Port / Yard: yard.agent@tikurabay.com
Customer Portal: customer1@tikurabay.com
Driver App: driver.demo@tikurabay.com
Password: ChangeMe123!
Driver Phone: +251900000015
Driver PIN: 2112
```

Use the matching role account for each desk step below.

## Start Here: Quick Copy/Paste E2E

```text
E2E Manual Test

Use this section if you know nothing about the system.
Just follow the steps in order.
Do not skip a step.
Always write down the Quote number and Booking number when they appear.
If a page does not load, refresh once and log in again.
If you do not see the booking in the next desk, search using the BK number you wrote down.

Admin Login
Email: superadmin@tikurabay.com
Password: ChangeMe123!

Customer Portal Login
Email: customer1@tikurabay.com
Password: ChangeMe123!

Supplier Agent Login
Email: supplier.agent@tikurabay.com
Password: ChangeMe123!

Djibouti Release Login
Email: djibouti.release@tikurabay.com
Password: ChangeMe123!

Clearance Login
Email: clearance.agent@tikurabay.com
Password: ChangeMe123!

Dispatch Login
Email: dispatch.agent@tikurabay.com
Password: ChangeMe123!

Yard Login
Email: yard.agent@tikurabay.com
Password: ChangeMe123!

Driver App Login
Phone: +251900000015
PIN: 2112

STEP 1. CREATE QUOTE AND BOOKING
Open: http://127.0.0.1:6010/shipments/intake?mode=booking

Login:
superadmin@tikurabay.com
ChangeMe123!

Do this:

- Make sure you are on Booking / Quote Desk
- Fill the form
- Generate quote
- Send quote
- Mark customer accepted
- Confirm booking

Fill these values:

- Customer: Alem Logistics PLC
- Company: Alem Logistics PLC
- Phone: +251911220190
- Email: ops@alemlogistics.com
- Consignee: Solomon Bekele
- Notify party: Alem Logistics PLC
- 2nd notify party: Same as consignee
- Shipment mode: Multimodal
- Booking type: FCL
- Service level: Door to Door
- Origin country: China
- Origin city / port: Shanghai
- Port of loading: Shanghai
- Port of discharge: Djibouti
- Place of receipt: Shanghai export consolidation yard
- Inland destination: Modjo Dry Port
- Final delivery: Adama industrial zone, customer receiving dock
- Incoterm: CIF
- Cargo description: Crated machinery spare parts, cable kits, and control accessories.
- HS code: 8483.40
- Marks & numbers: ALEM/SHG/001-042
- Package summary: 42 crates and pallets
- Gross weight: 18800
- Volume: 24.5
- Container type: 40FT High Cube
- Container quantity: 1
- Freight term: Prepaid
- Prepaid at: Shanghai
- LC number: LC-260326-001
- Bank permit number: BP-2026-001
- Consignee TIN: 0012345678
- TIN area code: AA
- Vessel: MSC Blue Nile
- Voyage: VOY-260322-001
- ETA loading port: 2026-04-06 10:00

Click these buttons in order:

- Generate Quote
- Send Quote to Customer
- Customer agreed by email
- Confirm Booking

Write down these numbers before moving to the next step:

- Quote: QT-...
- Booking: BK-...

Expected result:

- You have one Quote number
- You have one Booking number
- The booking is confirmed
```

## Copy/Paste Test Data

```text
Customer Type: New customer
Customer / Company Name: Alem Logistics PLC
Company Legal Name: Alem Logistics PLC
Customer Contact Person: Solomon Bekele
Customer Address: Addis Ababa, Ethiopia
Customer TIN / VAT Number: 0012345678
Phone: +251911220190
Email: ops@alemlogistics.com

Shipper Company Name: Alem Logistics PLC
Shipper Contact Person: Origin shipping desk
Shipper Full Address: Shanghai export consolidation yard
Shipper Phone Number: +86 21 5555 0123
Shipper Email Address: origin@alemlogistics.com

Consignee Name: Alem Logistics PLC
Consignee Company: Alem Logistics PLC
Notify Party: Same as consignee
2nd Notify Party:

Shipment Mode: Multimodal
Booking Type: FCL
Shipment Direction: Import
Service Level: Door to Door
Priority: Standard
Request Source: Customer

Origin Country: China
Origin City / Port: Shanghai
Port of Loading: Shanghai
Place of Receipt: Shanghai export consolidation yard

Destination Country: Ethiopia
Destination City / Port: Modjo Dry Port
Port of Discharge: Djibouti
Final Delivery Address: Adama industrial zone, customer receiving dock

Preferred Departure Window: 2026-04-06 to 2026-04-09
Preferred Arrival Window: 2026-04-18 to 2026-04-23
Incoterm: CIF

Cargo Category: Industrial spare parts
Commodity Description: Crated machinery spare parts, cable kits, and control accessories.
HS Code: 8483.40
Marks and Numbers: ALEM/SHG/001-042
Gross Weight: 18800
Volume CBM: 24.5
Package Count: 42
Packaging Type: Crates and pallets

Freight Payment Term: prepaid
Prepaid At: Shanghai
LC Number: LC-260326-001
Consignee TIN Number: 0012345678
TIN Area Code: AA

Container Type: 40FT High Cube
Container Quantity: 1
Container Size: 40FT
Stuffing Type: Factory stuffing
Empty Pickup Location: Shenzhen empty pickup yard
Seal Required: checked
Empty Return Depot Preference: Djibouti Container Depot
Equipment Notes: Standard dry box with customs seal control.

Cargo Ready Date: 2026-04-05
Customs Readiness: Ready
Documents Completeness: Complete
Vessel Name: MSC Blue Nile
Voyage Number: VOY-260322-001
ETA Loading Port: 2026-04-06

Shipping Certificate Required: checked
Trucking Required: checked
Insurance Required: checked
Customs Clearance Support: checked
Origin Handling Needed: checked
Destination Handling Needed: checked
Vessel Booking Assistance: checked
```

## 1. Quote Creation

1. Open `http://127.0.0.1:6010/shipments/intake?mode=quote`.
2. Set `Customer type` to `New customer`.
3. Confirm the customer/company section is blank.
4. Paste the test data into the form.
5. Click `Download Quote Request PDF`.
6. Verify the quote request PDF has the expected centered header, clean spacing, and correct values.
7. Click `Generate Quote`.
8. Click `Send Quote to Customer`.
9. Record the new quote ID.

Expected result:
- quote ID is created
- quote send succeeds
- quote request PDF is downloadable
- customer-facing record is created

## 2. Customer Quote Review

1. Open `http://127.0.0.1:6011`.
2. Log in as `customer1@tikurabay.com`.
3. Open the new quote/shipment record.
4. Verify the quotation request document is visible and downloadable.
5. Accept the quote.

Expected result:
- quote status changes to accepted
- approval is recorded

## 3. Booking Confirmation

1. Open `http://127.0.0.1:6010/shipments/intake?mode=booking`.
2. Load the accepted quote/booking record.
3. Verify the shipment details carried over correctly.
4. Click `Download Booking Request PDF`.
5. Verify the booking PDF layout and values.
6. Click `Confirm Booking`.
7. Record the new booking ID.

Expected result:
- booking ID is created
- booking request PDF is downloadable
- booking moves to origin / supplier workflow

## 4. Supplier / Origin Handoff

1. Log in as `supplier.agent@tikurabay.com`.
2. Open `http://127.0.0.1:6010/operations/supplier-agent`.
3. Open the new booking.
4. Complete the supplier/origin steps in this order:
   - `Booking`
   - `Cargo Items`
   - `Documents`
   - `Container & Seal`
   - `Stuffing`
   - `Gate-in`
   - `Ocean Handoff`
5. Upload or complete origin documents:
   - commercial invoice
   - packing list
   - BL draft or BL placeholder
   - export / customs docs
6. Enter container and seal details.
7. Use these values in `Container & Seal`, `Stuffing`, and `Ocean Handoff`:

```text
Container & stuffing:
- Container number: MSCU3344556
- Seal number: SL-260322-001
- Stuffing date/time: 2026-03-22 12:15
- Stuffing location: Shanghai export yard
- Loaded by: Origin loading team

Ocean handoff:
- Carrier: MSC
- Vessel: MSC Blue Nile
- Voyage: VOY-260322-001
- ETD: 2026-03-23 10:00
- ETA Djibouti: 2026-03-30 16:00
```

8. Click the blinking next-step action until `Ocean Handoff` is complete.
9. Click the blinking `Open Shipping Workspace` button.

Expected result:
- booking appears ready for shipping-doc processing
- container/tracking record exists
- Shipping Workspace opens on the same booking

## 5. Shipping Workspace

Shipping Workspace tabs to verify:
- Carrier Schedules
- Shipping Instructions
- Bills of Lading
- Manifest
- Tracking
- Finance
- After-Sales

1. Open the shipping workspace.
2. Find the new booking.
3. Open `Carrier Schedules` and verify the selected vessel/voyage can be linked to the booking if required.
4. Open `Shipping Instructions` and complete the shipping instruction.
5. Open `Bills of Lading` and verify the BL draft/final record.
6. Open `Manifest` and generate/verify the manifest.
7. Open `Tracking` and confirm the shipment/container reference is visible.
8. Open `Finance` and verify shipping-side finance/settlement visibility if applicable.
9. Open `After-Sales` and verify the tab loads correctly for the shipment lifecycle.
10. Download each generated document.

Expected result:
- shipping workspace tabs load correctly
- shipping instruction is completed
- bill of lading is recorded
- manifest is generated
- tracking is visible from shipping workspace
- PDFs are downloadable

## 6. Djibouti Release

1. Open the Djibouti release desk.
2. Open the shipment.
3. Verify the `Document Center` contains the required documents.
4. Mark `Documents Ready for Clearance`.
5. Download the clearance pack if available.
6. Push the shipment to clearance.

Expected result:
- `documents ready` state is visible
- clearance handoff is recorded
- shipment appears in clearance queue

## 7. Clearance / Transitor

1. Open the clearance desk.
2. Filter `Ready for Clearance`.
3. Open the shipment.
4. Acknowledge receipt.
5. Start clearance.
6. Complete clearance.
7. Download:
   - batch sheet
   - clearance release

Expected result:
- clearance status becomes completed
- dispatch release becomes available

## 8. Dispatch

1. Open the corridor dispatch desk.
2. Open the shipment.
3. Assign:
   - truck
   - trailer
   - driver
4. Generate and download:
   - loading report
   - driver transit packet
5. Push to dry-port / yard desk.

Expected result:
- inland trip is created
- dispatch documents are downloadable
- dry-port / yard desk can see the handoff

## 9. Driver Mobile Sync

1. Open the driver app.
2. Log in as `driver.demo@tikurabay.com`.
3. Verify the assigned trip is visible.
4. Open the transit pack.
5. Verify:
   - booking/trip reference
   - route
   - document list
   - next checkpoint
6. Submit one checkpoint update.

Expected result:
- trip is visible in the app
- checkpoint update appears in admin tracking

## 10. Dry-Port / Yard Release

1. Open the dry-port / yard desk.
2. Open the shipment.
3. Verify release authorization is present.
4. Record cargo arrival / unload.
5. Confirm release to customer.
6. Enter:
   - receiver name
   - receiver ID/reference
   - remarks
7. Upload proof if required.

Expected result:
- cargo release is recorded
- customer handoff is completed

## 11. Customer Document Handover

1. In admin documents/finance/release views, verify final customer documents are available:
   - customs docs
   - release note
   - handover docs
   - interchange docs if applicable
2. In the customer portal, verify the same shipment exposes final downloadable documents.

Expected result:
- customer can see final release-side documents

## 12. Empty Return / Empty In

1. Open the empty-return or yard/closure desk.
2. Open the same shipment/container.
3. Record:
   - cargo unloaded
   - empty pending return
   - empty returned to Djibouti
   - interchange document received
4. Enter:
   - container number
   - seal number
   - location
   - date/time
   - condition notes
5. Upload the empty-return/interchange document.
6. Mark the cycle closed.

Expected result:
- empty return is captured
- interchange document is recorded
- container cycle closes successfully

## 13. Public Tracking Check

1. Open `http://127.0.0.1:6010/shipping/track`.
2. Search using:
   - booking number
   - trip number
   - container number

Expected result:
- shipment resolves from aliases
- movement timeline includes the later stages through empty return

## 14. PDF / Print Checklist

Download and inspect:
- Quote Request PDF
- Quote Acceptance PDF
- Booking Request PDF
- Manifest PDF
- BL output
- Batch Sheet
- Clearance Release
- Loading Report
- Driver Transit Packet
- Release Authorization
- Yard Receipt / handover docs

Check all of these:
- centered branded header where applicable
- same blue/office-style visual family
- no mixed colors
- no overlapping text
- no raw sample filename leakage
- correct references and shipment data

## 15. Pass Criteria

Mark the test as passed only if all are true:
- quote created and sent
- customer approval works
- booking confirmed
- origin handoff completed
- shipping docs completed
- Djibouti to clearance handoff works in-system
- dispatch trip created
- driver app sync works
- dry-port / yard release works
- empty return captured
- tracking works by booking/trip/container
- all PDFs download and print cleanly

## Failure Log Template

```text
Date:
Tester:
Environment:
Quote ID:
Booking ID:
Trip ID:
Container No:

Failed Step:
Observed Result:
Expected Result:
Screenshot / File:
Notes:
```
