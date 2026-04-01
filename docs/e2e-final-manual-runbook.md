# Tikur Abay Final Manual E2E Runbook

This is the canonical manual E2E runbook for the current local stack. If another E2E markdown file conflicts with this one, use this file.

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
19. Dispatch handoff approved
↓
20. Truck assigned + inland delivery
↓
21. Cargo released at yard / dry port
↓
22. Empty return / empty in recorded
↓
23. Driver uploads expenses in mobile app
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
Password: ChangeMe123!
Driver Phone: +251900000015
Driver PIN: 2112
```

Use the matching role account for each desk step below.

## Copy/Paste Test Data

```text
Customer Type: New customer
Customer / Company Name: Alem Logistics PLC
Company Legal Name: Alem Logistics PLC
Customer Contact Person: Solomon Bekele
Customer Address: Addis Ababa, Ethiopia
Customer TIN / VAT Number: 0012345678
Phone: +251911220190
Email: write2get@gmail.com

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
- Email: write2get@gmail.com
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

STEP 2. SUPPLIER AGENT / CHINA DESK
Open: http://127.0.0.1:6010/operations/supplier-agent

Login:
supplier.agent@tikurabay.com
ChangeMe123!

Search for:
<BK-NUMBER>

Do this:

- Open the booking
- Complete the origin steps from left to right
- Add cargo lines
- Upload origin documents
- Fill container, seal, stuffing, and vessel handoff details
- Finish the handoff
- Click the blinking Open Shipping Workspace button

Add these cargo lines:

- Photovoltaic solar panels
- Construction hardware and fasteners
- Steel fittings

Upload these files:

- docs/e2e-samples/commercial-invoice-sample.pdf
- docs/e2e-samples/packing-list-sample.pdf
- docs/e2e-samples/bl-draft-sample.pdf
- docs/e2e-samples/final-bl-sample.pdf
- docs/e2e-samples/transit-customs-doc-sample.pdf
- docs/e2e-samples/stuffing-photo-sample.svg
- docs/e2e-samples/seal-photo-sample.svg

Fill container & stuffing:

- Container number: MSCU3344556
- Seal number: SL-260322-001
- Stuffing date/time: 2026-03-22 12:15
- Stuffing location: Shanghai export yard
- Loaded by: Origin loading team

Fill ocean handoff:

- Carrier: MSC
- Vessel: MSC Blue Nile
- Voyage: VOY-260322-001
- ETD: 2026-03-23 10:00
- ETA Djibouti: 2026-03-30 16:00

Expected result:

- Origin handoff completes
- The system shows the booking is ready for the next desk
- Shipping Workspace opens on the same BK number

STEP 3. SHIPPING INSTRUCTION
Open: http://127.0.0.1:6010/shipping/instructions

Login:
superadmin@tikurabay.com
ChangeMe123!

Search for:
<BK-NUMBER>

Check or fill these values if needed:

- shipper
- consignee
- notify
- cargo description
- container no
- seal no
- gross weight
- measurement
- HS code
- place of receipt
- place of delivery
- TIN
- area code
- LC / bank permit

Click these buttons in order:

- Save SI draft
- Submit shipping instruction
- Approve shipping instruction

Expected result:

- Shipping instruction is approved

STEP 4. BILLS OF LADING
Open: http://127.0.0.1:6010/shipping/bills-of-lading

Search for:
<BK-NUMBER>

Check or fill:

- House BL
- Master BL
- Slot carrier bill no
- Carrier
- Vessel
- Voyage
- Freight term
- Place of issue
- Shipped on board date

Click these buttons in order:

- Approve Carrier BL and House BL draft
- Finalize House BL and Master BL

Then test these print buttons:

- Print Original BL
- Print 3 Originals
- Print Copy

Expected result:

- BL is finalized
- Print actions work

STEP 5. MANIFEST
Open: http://127.0.0.1:6010/shipping/manifest

Search for:
<BK-NUMBER> or use vessel grouping

Click:

- Generate voyage manifest

Expected result:

- Manifest is generated

STEP 6. SHIPPING FINANCE / LC
Open: http://127.0.0.1:6010/shipping/finance

Search for:
<BK-NUMBER>

Check that invoice lines show:

- invoice lines show:
  - C fee rate / Sea Freight
  - Port / Djibouti Clearance
  - Inland Transport

Click these buttons in order:

- Verify LC and bank packet
- Mark LC paid
- Record USD payment
- Record ETB payment

Expected result:

- Finance / LC status advances
- Payment entries are recorded

STEP 7. DJIBOUTI RELEASE
Open: http://127.0.0.1:6010/operations/djibouti-release

Login:
djibouti.release@tikurabay.com
ChangeMe123!

Search for:
<BK-NUMBER>

Click these buttons in order:

- Confirm vessel arrived
- Confirm discharge
- Confirm line release
- Mark customs cleared
- Mark transit packet complete
- Mark gate-out ready
- Send to transitor / clearance

Expected result:

- Shipment is sent to clearance

STEP 8. TRANSITOR / CLEARANCE
Open: http://127.0.0.1:6010/operations/transitor-clearance

Login:
clearance.agent@tikurabay.com
ChangeMe123!

Search for:
<BK-NUMBER>

Click these buttons in order:

- Assign transitor
- Prepare T1
- Mark charges paid
- Release to dispatch

Expected result:

- Shipment is released to dispatch

STEP 9. DISPATCH
Open: http://127.0.0.1:6010/operations/corridor-dispatch

Login:
dispatch.agent@tikurabay.com
ChangeMe123!

Search for:
<BK-NUMBER>

Click these buttons in order:

- Assign truck
- Assign driver
- Push pack to driver mobile
- Confirm departure

Expected result:

- Dispatch trip is created
- Driver mobile should receive the trip

STEP 10. TRACKING API CHECK
Open in browser:

- http://127.0.0.1:6010/api/tracking?query=<BK-NUMBER>
- http://127.0.0.1:6010/api/container?query=<BK-NUMBER>

Expected:

- container record visible
- events visible
- related containers visible if applicable

STEP 11. PUBLIC TRACKING PAGE
Open:

- http://127.0.0.1:6010/shipping/track?query=<BK-NUMBER>
- or http://127.0.0.1:6010/track/MSCU3344556

Check:

- lifecycle timeline visible
- event log visible
- predictive ETA visible
- return control visible
- alerts visible

STEP 12. DRIVER MOBILE
Login:
+251900000015
2112

Submit these checkpoints:

- PK12 corridor exit
- Ali Sabieh weighbridge
- Galafi border checkpoint
- Awash checkpoint
- Adama Dry Port gate

Expected result:

- Driver trip is visible
- Checkpoints appear in the system

STEP 13. YARD / DELIVERY
Open: http://127.0.0.1:6010/operations/dry-port-yard

Login:
yard.agent@tikurabay.com
ChangeMe123!

Search for:
<BK-NUMBER>

Fill receipt:

- Consignee rep: Solomon Bekele
- Company: Alem Logistics PLC
- Contact: +251900000215
- Note: Received clean with no shortage or damage.

Click these buttons in order:

- Confirm inland arrival
- Confirm gate-in
- Start unload
- Complete unload
- Mark ready for pickup
- Prepare POD
- Capture signature
- Upload POD
- Mark goods received
- Mark empty released
- Start empty return
- Confirm empty returned
- Upload return receipt
- Send thank-you message

Expected result:

- Yard release is complete
- Empty return is complete

STEP 14. EXECUTIVE VERIFY
Open: http://127.0.0.1:6010/?tab=journey

Search for:
<BK-NUMBER>

Check:

- shipment visible
- stage Closed
- no stale blocker

STEP 15. CUSTOMER VERIFY
Open: http://127.0.0.1:6011

Login:
customer1@tikurabay.com
ChangeMe123!

Search for:
<BK-NUMBER>

Check:

- shipment visible
- customer status closed / completed
- container tracking visible

Pass Conditions

- quote created
- booking created
- SI approved
- BL finalized
- manifest generated
- LC / payment recorded
- Djibouti cleared
- dispatch departed
- tracking API responds
- public tracking page updates
- yard closes
- executive shows Closed
- customer view shows closed
```

## 1. Quote Creation

1. Open `http://127.0.0.1:6010/shipments/intake?mode=quote`.
2. Log in with your admin / super-admin console account.
3. Confirm you are on `Booking / Quote Desk`.
4. Set `Customer type` to `New customer`.
5. Confirm the customer/company section is blank.
6. Paste the test data into the form.
7. Click `Download Quote Request PDF`.
8. Verify the quote request PDF has the expected centered header, clean spacing, and correct values.
9. Click `Generate Quote`.
10. Click `Send Quote to Customer`.
11. Record the new quote ID.

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
2. Log in with your admin / super-admin console account if needed.
3. Load the accepted quote/booking record.
4. Verify the shipment details carried over correctly.
5. Click `Download Booking Request PDF`.
6. Verify the booking PDF layout and values.
7. Click `Confirm Booking`.
8. Record the new booking ID.

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
2. Confirm the workspace opens on the same `BK-...` record from the supplier handoff.
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

1. Log in as `djibouti.release@tikurabay.com`.
2. Open `http://127.0.0.1:6010/operations/djibouti-release`.
3. Open the shipment.
4. Verify the `Document Center` contains the required documents.
5. Mark `Documents Ready for Clearance`.
6. Download the clearance pack if available.
7. Push the shipment to clearance.

Expected result:
- `documents ready` state is visible
- clearance handoff is recorded
- shipment appears in clearance queue

## 7. Clearance / Transitor

1. Log in as `transitor.agent@tikurabay.com`.
2. Open `http://127.0.0.1:6010/operations/transitor-clearance`.
3. Filter `Ready for Clearance`.
4. Open the shipment.
5. Acknowledge receipt.
6. Start clearance.
7. Complete clearance.
8. Download:
   - batch sheet
   - clearance release

Expected result:
- clearance status becomes completed
- dispatch release becomes available

## 8. Dispatch

1. Log in as `dispatch.agent@tikurabay.com`.
2. Open `http://127.0.0.1:6010/operations/corridor-dispatch`.
3. Open the shipment.
4. Assign:
   - truck
   - trailer
   - driver
5. Generate and download:
   - loading report
   - driver transit packet
6. Push to dry-port / yard desk.

Expected result:
- inland trip is created
- dispatch documents are downloadable
- dry-port / yard desk can see the handoff

## 9. Driver Mobile Sync

1. Open the driver app.
2. Log in with phone `+251900000015` and PIN `2112`.
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

1. Log in as `yard.agent@tikurabay.com`.
2. Open `http://127.0.0.1:6010/operations/dry-port-yard`.
3. Open the shipment.
4. Verify release authorization is present.
5. Record cargo arrival / unload.
6. Confirm release to customer.
7. Enter:
   - receiver name
   - receiver ID/reference
   - remarks
8. Upload proof if required.

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

1. Stay in `Dry-Port / Yard Desk` or open the yard/closure view.
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
