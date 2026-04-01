# Mobile Presentation Walkthrough

This walkthrough is for presenting the Tikur Abay mobile app in its current state without drifting into weaker or unfinished paths.

## Best Demo Story

Present the app as one mobile workspace with two controlled role experiences:

1. Customer access is OTP-first and fast.
2. Driver access is OTP-first but operationally gated by KYC.
3. Document policy drives what the user must do next.

That story matches the strongest implemented flows.

## Recommended Demo Paths

### Path 1: Customer

Use this path to show speed and clarity.

1. Open the app on the welcome screen.
2. Show the language selector briefly.
3. Choose `Customer / User`.
4. Enter phone or email.
5. Move through OTP verification.
6. Land in the customer experience.
7. Open `Docs`.
8. Show focused document guidance and upload action.
9. Show preview behavior for an uploaded document if available.

What to say:

- Customers do not face a long registration wall first.
- OTP decides whether the user enters directly or finishes a short profile.
- Required documents are visible before operations get blocked.

### Path 2: Driver

Use this path to show control and operational readiness.

1. Return to the welcome screen.
2. Choose `Driver`.
3. Enter phone number.
4. Move through OTP verification.
5. Land on the KYC pending screen.
6. Show the current status and approval blockers.
7. Open the document center from that screen.
8. Show focused driver KYC documents and upload actions.

What to say:

- Drivers get the same low-friction OTP entry.
- Access is controlled by KYC, not passwords or manual dispatch workarounds.
- Missing documents are explicit and actionable.

## 3-Minute Demo Script

Use this version for executives or a crowded agenda.

### Minute 1: Welcome and Customer Entry

Tap flow:

1. Open the app.
2. Show `Customer / User`.
3. Open customer login.
4. Enter phone or email.
5. Move into OTP verification.

Say:

- Tikur Abay uses one app for both customer and driver journeys.
- The first design choice is low-friction access: contact first, OTP second.
- Customers can move quickly without facing a long registration process up front.

### Minute 2: Customer Document Workflow

Tap flow:

1. Enter the customer shell.
2. Open `Docs`.
3. Focus a required document.
4. Show upload or preview behavior.

Say:

- The app does not wait until operations fail before telling the user what is missing.
- Document policy drives what is required, what can be uploaded, and what should be handled first.
- This keeps customer onboarding and shipment readiness clear.

### Minute 3: Driver KYC Control

Tap flow:

1. Return to welcome.
2. Open the driver flow.
3. Move through OTP.
4. Show the KYC pending screen.
5. Open the document center from the pending screen.

Say:

- Drivers get the same fast OTP entry, but operational access is controlled by KYC approval.
- Missing Fayda or license documents are visible immediately.
- This reduces friction without losing operational control.

## 7-Minute Demo Script

Use this version for product, engineering, or operations stakeholders.

### Part 1: Product Framing

Say:

- The mobile app supports both customers and drivers in one product surface.
- The core UX decision is OTP-first identity.
- The core operations decision is KYC-gated driver access.
- The core workflow decision is policy-driven documents.

### Part 2: Customer Journey

Tap flow:

1. Welcome screen.
2. Language selector.
3. Customer login.
4. OTP screen.
5. Customer shell.
6. Customer docs.

Say:

- Customers can enter with phone or email.
- Existing users go straight in.
- New users complete only a short profile after OTP.
- The document center shows what is required before later workflow blockers appear.

### Part 3: Document Focus UX

Tap flow:

1. Tap a required document.
2. Show focused document mode.
3. Show upload action.
4. Show preview or fallback behavior.
5. Clear focus and return to the full list.

Say:

- The app supports document focus, not just document listing.
- A user can move directly from a blocker to the right upload target.
- Preview and error handling are explicit, so the workflow is stable even when files or URLs are missing.

### Part 4: Driver Journey

Tap flow:

1. Return to welcome.
2. Driver login.
3. OTP verification.
4. KYC pending.
5. Approval blockers panel.
6. Driver document center.

Say:

- Driver onboarding is still fast, but not permissive.
- The KYC screen explains status, blockers, and next actions.
- This is the business-control layer for dispatch and compliance.

### Part 5: Close

Say:

- The current mobile app is strong on access, control, and document workflow clarity.
- The strongest implemented story today is OTP-first onboarding plus policy-driven documents.
- This is a solid foundation for rollout and further operational depth.

## Exact Talking Points

Use these short lines if you want a tighter presentation style.

- `One app, two roles, one access model.`
- `Customers move fast. Drivers move fast, but with KYC control.`
- `OTP decides access first. Profile completion happens only when needed.`
- `Required documents are visible before they become operational blockers.`
- `The app pushes users from issue to action, not from issue to confusion.`

## Demo Order

If you only have time for one uninterrupted flow, use this order:

1. Welcome
2. Customer login
3. OTP
4. Customer docs
5. Return to welcome
6. Driver login
7. OTP
8. KYC pending
9. Driver docs

## Demo Setup Checklist

Before walking into the room:

1. Use the exact emulator or device you will present from.
2. Confirm the app launches on the welcome screen.
3. Confirm one customer path and one driver path work end to end.
4. Keep one uploaded document available for preview if possible.
5. Keep backup screenshots ready in case a live backend step slows down.

## Screens Worth Showing

- Welcome role selection
- Customer login
- Driver login
- OTP verification
- Driver KYC pending
- Document center with focused document context
- Profile

## Screens To Avoid In A Live Demo Unless Rehearsed

- Deep trip execution flows
- Anything depending on live realtime events
- Rare backend error scenarios
- Any path that depends on external services you have not prechecked

## Rehearsal Checklist

Before presenting, verify these exact flows on the device or emulator you will use:

1. Welcome screen loads cleanly.
2. Customer OTP flow reaches the customer shell.
3. Driver OTP flow reaches the KYC pending screen.
4. Focused document upload action opens correctly.
5. Preview opens or shows the correct fallback state.
6. Profile screen scrolls and logout is visible.

## Presenter Notes

- Keep the message on simplicity first, control second.
- Do not oversell the current state as fully production-complete.
- Frame this as a strong mobile foundation with clean onboarding, document workflows, and role-specific control.

## Fast Fallback Plan

If one live API-backed step fails during presentation:

1. Return to the welcome screen.
2. Show the other role flow.
3. Open document center and profile, which are still useful for demonstrating structure and UX.
4. Explain that OTP, KYC gating, and document policy are the core design decisions, not the one failing backend response.
