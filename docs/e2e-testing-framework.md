# E2E Testing Framework

## Run
- Smoke: `pnpm e2e:smoke`
- Critical lifecycle: `pnpm e2e:critical`
- Full browser suite: `pnpm e2e:full`
- One spec: `pnpm e2e:spec -- e2e/specs/booking/booking-lifecycle.spec.js`

## Structure
- `e2e/fixtures`: deterministic shipment/customer test data
- `e2e/helpers`: auth, runtime monitoring, environment, setup
- `e2e/selectors`: stable test IDs
- `e2e/pages`: page objects
- `e2e/flows`: reusable business flows
- `e2e/specs`: smoke, booking, quote, China desk, guardrails

## Selector strategy
- Prefer `data-testid`
- Use semantic role selectors next
- Use text fallback only inside page objects when no stable test ID exists yet

## Auth
- Global setup writes authenticated storage states to `e2e/.auth`
- HQ: `e2e/.auth/hq.json`
- Customer: `e2e/.auth/customer.json`

## Failure debugging
- Playwright keeps screenshots, trace, and video on failure
- Runtime monitor captures browser console errors, page errors, and failed requests

## CI grouping
- Smoke: route/render confidence on every PR
- Critical: booking, approval, handoff, guardrails
- Full: broader regression before release/nightly
