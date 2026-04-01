# Phase 1 Shipping Build Plan

## Goal

Establish the first production-grade shipping layer on top of the existing operations platform:

1. Quote
2. Booking
3. Document validation
4. Invoice / payment / settlement

This phase intentionally stops before full SI, BL, manifest, carrier scheduling, GPS, and incident workflows.

## Repo File Map

### Shared domain and storage

- `apps/admin/src/lib/shipping-phase1.ts`
  - Phase 1 shared types
  - quote / booking / validation / invoice / payment / settlement derivation
  - local storage persistence for validation and payment actions

- `apps/admin/src/lib/shared-quote-storage.ts`
  - shared quote sync between admin and customer portal
  - keep using this as the commercial source of truth

- `apps/admin/src/lib/booking-quote-demo-data.ts`
  - upstream quote + booking request seed data
  - continue extending this while Phase 1 remains local-storage driven

### Admin Phase 1 UI

- `apps/admin/src/components/shipping-phase1-workspace.tsx`
  - first admin workspace for:
    - Quotes
    - Bookings
    - Document validation loop
    - Invoice / payment / settlement

- `apps/admin/src/app/shipping/page.tsx`
  - top-level shipping workspace route

- `apps/admin/src/app/operations/shipping/page.tsx`
  - operations alias route for the same workspace

### Existing commercial workflow integration

- `apps/admin/src/components/booking-intake-workspace.tsx`
  - quote creation
  - approval capture
  - booking confirmation
  - booking number promotion after approval

- `apps/admin/src/components/booking-quote-desk-runtime.tsx`
  - queue and commercial action desk

- `apps/customer-portal/src/components/quote-review-workspace.tsx`
  - customer approval path

- `apps/admin/src/components/customer-workspace-runtime.tsx`
  - admin-side customer approval fallback

## Phase 1 Work Items

### A. Quote and booking truth

- Keep `QT-...` as commercial reference before approval.
- Reserve `BK-...` immediately on approval.
- Use `BK-...` as the operating reference after approval.

Primary files:

- `apps/admin/src/components/booking-intake-workspace.tsx`
- `apps/customer-portal/src/components/quote-review-workspace.tsx`
- `apps/admin/src/components/customer-workspace-runtime.tsx`

### B. Document validation loop

- Add strict statuses:
  - `pending`
  - `invalid`
  - `corrected`
  - `approved`
- Block downstream progression until all required docs are approved.

Primary file:

- `apps/admin/src/lib/shipping-phase1.ts`
- `apps/admin/src/components/shipping-phase1-workspace.tsx`

Future integration targets:

- `apps/admin/src/components/supplier-agent-desk-runtime.tsx`
- `apps/admin/src/components/djibouti-release-desk-runtime.tsx`

### C. Finance lifecycle

- Split invoice charges into:
  - Sea freight `USD`
  - Djibouti clearance `USD`
  - Inland transport `ETB`
- Add payment state:
  - `pending`
  - `partial`
  - `paid`
- Add settlement state:
  - `outstanding`
  - `closed`

Primary file:

- `apps/admin/src/lib/shipping-phase1.ts`
- `apps/admin/src/components/shipping-phase1-workspace.tsx`

Future integration targets:

- `apps/admin/src/components/finance-workspace-runtime.tsx`
- `apps/admin/src/components/payments-workspace-runtime.tsx`

## Next Slice After Phase 1

### Phase 2 Status

Phase 2 has started inside the existing shipping workspace to keep the first shipping module coherent:

- `apps/admin/src/lib/shipping-phase1.ts`
  - now also carries Phase 2 local state for:
    - Shipping Instruction
    - Bill of Lading
    - Manifest
  - enforces:
    - no BL final before SI approval
    - no manifest generation before BL final

- `apps/admin/src/components/shipping-phase1-workspace.tsx`
  - now renders the first Phase 2 control panels for:
    - Shipping Instruction
    - Bill of Lading
    - Manifest

- `apps/admin/src/components/shipping-phase2-workspace.tsx`
  - focused Phase 2 document workspace with route-specific views for:
    - Shipping Instructions
    - Bills of Lading
    - Manifest

- dedicated routes:
  - `apps/admin/src/app/shipping/instructions/page.tsx`
  - `apps/admin/src/app/shipping/bills-of-lading/page.tsx`
  - `apps/admin/src/app/shipping/manifest/page.tsx`
  - `apps/admin/src/app/operations/shipping/instructions/page.tsx`
  - `apps/admin/src/app/operations/shipping/bills-of-lading/page.tsx`
  - `apps/admin/src/app/operations/shipping/manifest/page.tsx`

### Phase 2

- Shipping Instruction
- House BL / Master BL
- Manifest generation
- Carrier / vessel / voyage workspace

Suggested files:

- `apps/admin/src/lib/shipping-documents.ts`
- `apps/admin/src/components/shipping-instruction-workspace.tsx`
- `apps/admin/src/components/bill-of-lading-workspace.tsx`
- `apps/admin/src/components/manifest-workspace.tsx`
- `apps/admin/src/app/shipping/instructions/page.tsx`
- `apps/admin/src/app/shipping/bills-of-lading/page.tsx`
- `apps/admin/src/app/shipping/manifest/page.tsx`

### Phase 3

- Fleet pool
- Driver assignment lifecycle
- Container movement event stream
- GPS / live location
- Incident workflow

### Phase 4

- Trade finance desk
- Letter of credit verification
- Bank-document control
- Payment and settlement closure inside shipping

Current repo files:

- `apps/admin/src/lib/shipping-phase1.ts`
  - now also carries Phase 4 local state for:
    - Letters of credit
    - Trade-document verification
    - LC verification / paid lifecycle

- `apps/admin/src/components/shipping-phase4-finance-workspace.tsx`
  - focused Phase 4 finance workspace for:
    - LC queue
    - Trade-document checks
    - Invoice / payment / settlement

- dedicated routes:
- `apps/admin/src/app/shipping/finance/page.tsx`
- `apps/admin/src/app/operations/shipping/finance/page.tsx`

### Phase 5

- After-sales queue
- Post-delivery complaints and issues
- Feedback capture after closure
- Executive and customer visibility for after-sales state

Current repo files:

- `apps/admin/src/lib/shipping-phase1.ts`
  - now also carries Phase 5 local state for:
    - after-sales cases
    - feedback/rating closure
    - customer complaint and issue visibility

- `apps/admin/src/components/shipping-phase5-after-sales-workspace.tsx`
  - focused after-sales workspace for:
    - post-delivery case queue
    - resolution
    - feedback capture

- dedicated routes:
  - `apps/admin/src/app/shipping/after-sales/page.tsx`
  - `apps/admin/src/app/operations/shipping/after-sales/page.tsx`

### Phase 6

- Carrier schedule workspace
- Vessel and voyage assignment before BL finalization
- Manifest grouping driven by assigned carrier schedule

Current repo files:

- `apps/admin/src/lib/shipping-phase1.ts`
  - now also carries Phase 6 local state for:
    - carrier schedules
    - booking-to-schedule assignment
    - BL / manifest vessel synchronization

- `apps/admin/src/components/shipping-phase6-carrier-workspace.tsx`
  - focused carrier schedule workspace for:
    - sailing board
    - booking assignment
    - BL / manifest sync preview

- dedicated routes:
  - `apps/admin/src/app/shipping/carrier-schedules/page.tsx`
  - `apps/admin/src/app/operations/shipping/carrier-schedules/page.tsx`

### Phase 7

- Notification automation
- Shipping alerts surfaced inside the shared notification center
- Carrier cutoff, LC verification, tracking incidents, and after-sales follow-up emitted as first-class notifications

Current repo files:

- `apps/admin/src/lib/shipping-phase1.ts`
  - now also carries Phase 7 derived state for:
    - shipping notification feed
    - local read-state for shipping notifications
    - emitted notifications from:
      - carrier alerts
      - LC verification / paid events
      - open tracking incidents
      - after-sales open / feedback pending events

- `apps/admin/src/components/notifications-runtime.tsx`
  - merges server notifications with the live shipping notification feed
  - supports mark-one and mark-all read for shipping-generated alerts

## Immediate Rule Set

1. No booking before approval.
2. Approval creates booking number.
3. No BL before SI approval.
4. No manifest before BL final.
5. No downstream dispatch if required validation items are not approved.
6. Shipping actions must be role-gated by desk ownership even while state remains local-storage based.
6. Container is the tracked object, not the driver.
7. LC cannot be verified until all mandatory trade documents are approved.
8. LC cannot be marked paid until it is verified.
9. Post-delivery issue or complaint must stay visible until after-sales resolution.
10. Closed delivery with thank-you follow-up should remain feedback-pending until customer rating is captured.
11. Carrier schedule should be assigned before BL finalization so vessel and voyage remain consistent through manifest generation.
