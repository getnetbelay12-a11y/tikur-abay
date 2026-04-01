# Tikur Abay Production Acceptance Checklist

Use this as the final sign-off document before declaring a release ready.

## Environment and Build

Confirm all of the following:

- target env file is validated
- Mongo database target is correct for the environment
- Redis is reachable
- storage mode is correct for the environment
- release checklist passed
- web verification passed
- browser verification passed, including the critical corridor lifecycle suite
- mobile verification passed
- backend tests passed
- local or target image build passed

## Backend Acceptance

Confirm:

- `/api/v1/health` returns healthy
- `/api/v1/health/ready` returns ready
- `/api/v1/metrics` returns authenticated metrics
- `/api/v1/metrics/prometheus` returns export text
- login works
- refresh token rotation works
- logout works
- document upload and download works
- notification job path works
- Socket.IO authenticated connection works

## Admin Console Acceptance

Confirm:

- login works
- expired sessions redirect safely
- executive dashboard loads
- executive dashboard partially survives widget failures
- live fleet tracking loads
- maintenance pages load
- performance pages load
- driver KYC review pages load
- admin chat loads and updates
- notifications load
- document center loads and downloads work
- role-based route protection works
- booking intake creates a fresh quote and booking successfully
- supplier/origin desk receives the new booking and completes handoff
- shipping instruction, BL, manifest, and finance stages progress without reverting
- Djibouti release, clearance, dispatch, and yard closure complete on the same booking
- empty return confirmation is visible in the downstream consoles that require it

## Customer Acceptance

Confirm:

- customer login works
- dashboard loads agreements, bookings, and payments
- customer documents load
- agreement download works
- payment history loads
- customer access is restricted to customer-allowed routes

## Mobile Acceptance

Confirm:

- customer login works
- driver login works
- registration role selection works
- driver KYC-pending accounts are blocked from trip operations
- customer experience loads the correct tab set
- driver experience loads the correct tab set
- chat updates live
- alerts update live
- uploads work
- logout clears session correctly

## Operational Acceptance

Confirm:

- backup path has been created
- restore path is documented
- cutover checklist is complete
- rollback conditions are understood
- operator knows where logs and metrics are exposed
- the latest manual E2E evidence pack is attached or linked
- generated shipment documents were downloaded and opened successfully during acceptance

## Final Approval

Record:

- release identifier
- environment
- operator
- date
- backend accepted: yes/no
- admin accepted: yes/no
- customer accepted: yes/no
- mobile accepted: yes/no
- operations accepted: yes/no
- final production-ready sign-off: yes/no

You can generate a dated acceptance report template with:

```bash
pnpm acceptance:report
```

For the combined local sign-off flow, use:

```bash
pnpm release:signoff
```

For the full local release path including startup, use:

```bash
pnpm release:local
```
