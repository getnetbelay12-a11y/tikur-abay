MANUAL E2E RUNBOOK

ACCOUNTS

Super Admin
Email: superadmin@tikurabay.com
Password: ChangeMe123!

Supplier Agent
Email: supplier.agent@tikurabay.com
Password: ChangeMe123!

Djibouti Release
Email: djibouti.release@tikurabay.com
Password: ChangeMe123!

Clearance Agent
Email: clearance.agent@tikurabay.com
Password: ChangeMe123!

Dispatch Agent
Email: dispatch.agent@tikurabay.com
Password: ChangeMe123!

Yard Agent
Email: yard.agent@tikurabay.com
Password: ChangeMe123!

Driver App
Phone: +251900000015
PIN: 2112


BASE TEST DATA

Customer: Alem Logistics PLC
Company: Alem Logistics PLC
Phone: 0911111111
Email: write2get@gmail.com
Consignee: Solomon Bekele
Notify party: Alem Logistics PLC
2nd notify party: Same as consignee
Shipment mode: Multimodal
Booking type: FCL
Service level: Door to Door
Origin country: China
Origin city / port: Shanghai
Port of loading: Shanghai
Port of discharge: Djibouti
Place of receipt: Baoan consolidation yard, Shenzhen
Inland destination: Modjo Dry Port
Final delivery: Adama industrial zone, customer receiving dock
Incoterm: CIF
Cargo description: Crated machinery spare parts, cable kits, and control accessories.
HS code: 8483.40
Marks & numbers: ALM/SHG/001-042
Package summary: 42 crates and pallets
Gross weight: 18800
Volume: 24.5
Container type: 40FT High Cube
Container quantity: 1
Freight term: Prepaid
Prepaid at: Addis Ababa
LC number: LC-2026-001
Bank permit number: BP-2026-001
Consignee TIN: 0012345678
TIN area code: AA-01
Vessel: MSC Blue Nile
Voyage: VOY-260322-001
ETA loading port: 2026-04-06 10:00


ORIGIN / SUPPLIER DATA

Cargo lines:
1. Photovoltaic solar panels
2. Construction hardware and fasteners
3. Steel fittings

Uploads:
docs/e2e-samples/commercial-invoice-sample.pdf
docs/e2e-samples/packing-list-sample.pdf
docs/e2e-samples/bl-draft-sample.pdf
docs/e2e-samples/final-bl-sample.pdf
docs/e2e-samples/transit-customs-doc-sample.pdf
docs/e2e-samples/stuffing-photo-sample.svg
docs/e2e-samples/seal-photo-sample.svg

Container: MSCU3344556
Seal: SL-260322-001
Stuffing date/time: 2026-03-22 12:15
Stuffing location: Shanghai export yard
Loaded by: Origin loading team

Carrier: MSC
Vessel: MSC Blue Nile
Voyage: VOY-260322-001
ETD: 2026-03-23 10:00
ETA Djibouti: 2026-03-30 16:00


DRIVER CHECKPOINTS

1. PK12 corridor exit
2. Ali Sabieh weighbridge
3. Galafi border checkpoint
4. Awash checkpoint
5. Adama Dry Port gate


STEP 1. CREATE QUOTE AND BOOKING

Open:
http://127.0.0.1:6010/shipments/intake?mode=booking

Log in as:
superadmin@tikurabay.com
ChangeMe123!

Fill the Base Test Data.

Click in order:
1. Generate Final Quote
2. Customer agreed by email
3. Confirm Booking

Expected:
1. A QT-... is created
2. A BK-... is created
3. Booking is assigned to supplier.agent@tikurabay.com

Capture:
Quote: QT-...
Booking: BK-...


STEP 2. SUPPLIER AGENT / CHINA DESK

Open:
http://127.0.0.1:6010/operations/supplier-agent

Log in as:
supplier.agent@tikurabay.com
ChangeMe123!

Search:
<BK-NUMBER>

Complete:
1. Add the 3 cargo lines
2. Upload all 7 files
3. Enter container and stuffing details
4. Enter ocean handoff details
5. Complete the origin steps until handoff

Expected:
1. Booking is found by search
2. Uploads work
3. Handoff completes cleanly


STEP 3. SHIPPING INSTRUCTIONS

Open:
http://127.0.0.1:6010/shipping/instructions

Log in as:
superadmin@tikurabay.com
ChangeMe123!

Search:
<BK-NUMBER>

Check/fill:
shipper
consignee
notify
cargo description
container no
seal no
gross weight
measurement
HS code
place of receipt
place of delivery
TIN
area code
LC / bank permit

Click in order:
1. Save SI draft
2. Submit shipping instruction
3. Approve shipping instruction

Expected:
1. Save works
2. Submit works
3. Approval sticks
4. Next stage advances


STEP 4. BILLS OF LADING

Open:
http://127.0.0.1:6010/shipping/bills-of-lading

Search:
<BK-NUMBER>

Check/fill:
House BL
Master BL
Slot carrier bill no
Carrier
Vessel
Voyage
Freight term
Place of issue
Shipped on board date

Click in order:
1. Approve Carrier BL and House BL draft
2. Finalize House BL and Master BL

Then test:
1. Print Original BL
2. Print 3 Originals
3. Print Copy
4. Verify BL

Expected:
1. Draft approval works
2. Finalize sticks
3. All print actions work
4. Verify BL succeeds


STEP 5. MANIFEST

Open:
http://127.0.0.1:6010/shipping/manifest

Search:
<BK-NUMBER>

Click:
1. Generate voyage manifest

Expected:
1. Manifest is generated
2. Generate/block contradiction disappears
3. Download becomes available


STEP 6. SHIPPING FINANCE

Open:
http://127.0.0.1:6010/shipping/finance

Search:
<BK-NUMBER>

Check charge lines:
Sea Freight
Djibouti Clearance
Inland Transport

Click in order:
1. Verify LC and bank packet
2. Mark LC paid
3. Record USD payment
4. Record ETB payment

Expected:
1. LC becomes verified
2. LC becomes paid
3. USD payment records
4. ETB payment records
5. Blinking only moves to next real step


STEP 7. DJIBOUTI RELEASE

Open:
http://127.0.0.1:6010/operations/djibouti-release

Log in as:
djibouti.release@tikurabay.com
ChangeMe123!

Search:
<BK-NUMBER>

Click in order:
1. Confirm vessel arrived
2. Confirm discharge
3. Confirm line release
4. Mark customs cleared
5. Mark transit packet complete
6. Mark gate-out ready
7. Send to transitor / clearance

Expected:
1. Booking is found
2. Each step stays completed
3. File moves to clearance


STEP 8. TRANSITOR / CLEARANCE

Open:
http://127.0.0.1:6010/operations/transitor-clearance

Log in as:
clearance.agent@tikurabay.com
ChangeMe123!

Search:
<BK-NUMBER>

Click in order:
1. Assign transitor
2. Prepare T1
3. Mark charges paid
4. Release to dispatch

Expected:
1. Booking is found
2. Transitor email defaults to write2get@gmail.com
3. Assignment is recorded
4. Earlier steps do not reopen after release


STEP 9. DISPATCH

Open:
http://127.0.0.1:6010/operations/corridor-dispatch

Log in as:
dispatch.agent@tikurabay.com
ChangeMe123!

Search:
<BK-NUMBER>

Click in order:
1. Assign truck
2. Assign driver
3. Push pack to driver mobile
4. Confirm departure

Expected:
1. Booking is found
2. Truck assignment sticks
3. Driver assignment sticks
4. Driver packet push succeeds
5. Departure stays confirmed

Record:
Truck ID: ...
Driver: ...


STEP 10. DRIVER APP

Use driver app.

Log in:
Phone: +251900000015
PIN: 2112

Open assigned trip for:
<BK-NUMBER>
Container: MSCU8888888

Submit checkpoints in order:
1. PK12 corridor exit
2. Ali Sabieh weighbridge
3. Galafi border checkpoint
4. Awash checkpoint
5. Adama Dry Port gate

Expected:
1. Login works
2. Assigned trip is visible
3. All 5 checkpoints save
4. Tracking timeline updates


STEP 11. DRY PORT YARD

Open:
http://127.0.0.1:6010/operations/dry-port-yard

Log in as:
yard.agent@tikurabay.com
ChangeMe123!

Search:
<BK-NUMBER>

Fill receipt:
Consignee rep: Solomon Bekele
Company: Alem Logistics PLC
Contact: +251 900 000 215
Note: Received clean with no shortage or damage.

Click in order:
1. Confirm inland arrival
2. Confirm gate-in
3. Start unload
4. Complete unload
5. Mark ready for pickup
6. Prepare POD
7. Capture signature
8. Upload POD
9. Mark goods received
10. Mark empty released
11. Start empty return
12. Confirm empty returned
13. Upload return receipt
14. Send thank-you message

Expected:
1. Booking is found
2. Steps stay completed
3. Empty return closes cleanly
4. No step bounces backward


STEP 12. DISPATCH EMPTY RETURN CONFIRMATION

Open again:
http://127.0.0.1:6010/operations/corridor-dispatch

Log in as:
dispatch.agent@tikurabay.com
ChangeMe123!

Search:
<BK-NUMBER>

Click if shown:
1. Confirm empty returned

Expected:
1. Empty return shows as completed
2. Dispatch closure acknowledgement is recorded


STEP 13. EXECUTIVE / JOURNEY FINAL CHECK

Open:
http://127.0.0.1:6010/?tab=journey

Search:
<BK-NUMBER>

Expected final state:
Quote: completed
Customer approval: completed
Booking: completed
Origin preparation: completed
Shipping docs: completed
Djibouti release: completed
Clearance: completed
Finance settlement: completed
Release authorization: completed
Dispatch / inland delivery: completed
Driver expense reimbursement: completed if used
Shipment: Closed
Container lifecycle: Empty returned / closed


COPY/PASTE RESULT TEMPLATE

QT:
BK:

Step 1 Quote/Booking:
- Quote created: Yes/No
- Booking created: Yes/No
- Assigned to supplier agent: Yes/No

Step 2 Supplier Agent:
- Booking found: Yes/No
- Uploads worked: Yes/No
- Handoff completed: Yes/No
- Failed step/button:

Step 3 Shipping Instructions:
- Booking found: Yes/No
- Save draft worked: Yes/No
- Submit worked: Yes/No
- Approve worked: Yes/No
- Missing/wrong field:

Step 4 Bills of Lading:
- Booking found: Yes/No
- Finalize worked: Yes/No
- Print Original worked: Yes/No
- Print 3 Originals worked: Yes/No
- Print Copy worked: Yes/No
- Verify BL worked: Yes/No

Step 5 Manifest:
- Booking found: Yes/No
- Manifest generated: Yes/No
- Manifest number:
- Blocker still visible:

Step 6 Shipping Finance:
- Booking found: Yes/No
- Verify LC worked: Yes/No
- Mark LC paid worked: Yes/No
- Record USD payment worked: Yes/No
- Record ETB payment worked: Yes/No
- Missing charge:
- Wrong blinking step:

Step 7 Djibouti Release:
- Booking found: Yes/No
- All 7 actions worked: Yes/No
- Reverted/disabled step:

Step 8 Clearance:
- Booking found: Yes/No
- All 4 actions worked: Yes/No
- Default transitor email correct: Yes/No
- Step reactivated after release: Yes/No

Step 9 Dispatch:
- Booking found: Yes/No
- All 4 actions worked: Yes/No
- Truck ID:
- Driver:
- Departure stayed confirmed: Yes/No

Step 10 Driver App:
- Login worked: Yes/No
- Trip visible: Yes/No
- All 5 checkpoints submitted: Yes/No
- Failed checkpoint:

Step 11 Yard:
- Booking found: Yes/No
- All 14 actions worked: Yes/No
- Reverted/disabled step:
- Empty return closed: Yes/No

Step 12 Dispatch Empty Return Confirmation:
- Visible: Yes/No
- Confirmed: Yes/No

Step 13 Final Journey State:
- Shipment closed: Yes/No
- Container lifecycle closed: Yes/No

Overall:
- PASS / FAIL
- Notes:
