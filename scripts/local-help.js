#!/usr/bin/env node

console.log(`Tikur Abay local operations commands

Stack lifecycle:
- pnpm local:up
- pnpm local:down
- pnpm local:restart
- pnpm restart:local
- pnpm release:local
- pnpm docker:up
- pnpm docker:down
- pnpm docker:build

Verification:
- pnpm verify:all
- pnpm prod:verify
- pnpm web:verify
- pnpm mobile:verify
- pnpm release:checklist
- pnpm release:signoff

Diagnostics:
- pnpm doctor:local
- pnpm status:local
- pnpm status:report
- pnpm diagnose:local
- pnpm logs:local [services...]

Seed and data:
- pnpm seed:local
- pnpm reset:local
- pnpm refresh:data:local
- pnpm smoke:seed-integrity

Smoke checks:
- pnpm smoke:local
- pnpm smoke:admin-routes
- pnpm smoke:web-ui
- pnpm smoke:mobile-api
- pnpm smoke:realtime
- pnpm smoke:auth-refresh

Support and artifacts:
- pnpm acceptance:report
- pnpm support:local
- pnpm reports:cleanup
- pnpm support:cleanup
- pnpm cleanup:local

Legacy compatibility aliases:
- pnpm prod:up       -> pnpm local:up
- pnpm prod:down     -> pnpm local:down
- pnpm prod:build    -> pnpm docker:build
`);
