#!/usr/bin/env node

const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

const projectRoot = resolve(__dirname, '..');
const reportsDir = resolve(projectRoot, 'deploy', 'reports');
const timestamp = new Date().toISOString().replace(/[:]/g, '-');
const outputPath = resolve(reportsDir, `acceptance-${timestamp}.md`);

if (!existsSync(reportsDir)) {
  mkdirSync(reportsDir, { recursive: true });
}

const environment = process.env.RELEASE_ENVIRONMENT || 'local';
const releaseId = process.env.RELEASE_ID || `tikur-abay-${timestamp}`;
const operator = process.env.RELEASE_OPERATOR || 'TBD';

const contents = `# Tikur Abay Acceptance Report

- Release ID: ${releaseId}
- Environment: ${environment}
- Operator: ${operator}
- Generated At: ${new Date().toISOString()}

## Verification Summary

- [ ] Local production env validated
- [ ] Backend tests passed
- [ ] Web verification passed
- [ ] Mobile verification passed
- [ ] Production-style stack verification passed
- [ ] Release checklist completed
- [ ] Frontend production checklist completed
- [ ] Cutover checklist completed

## Backend Acceptance

- [ ] Health endpoint healthy
- [ ] Ready endpoint healthy
- [ ] Metrics endpoint accessible
- [ ] Login / refresh / logout flows confirmed
- [ ] Documents upload and download confirmed
- [ ] Realtime authenticated connection confirmed

## Frontend Acceptance

- [ ] Admin console sign-off complete
- [ ] Customer portal sign-off complete
- [ ] Mobile app sign-off complete
- [ ] Realtime UI sign-off complete

## Operational Acceptance

- [ ] Backup created
- [ ] Rollback path confirmed
- [ ] Logs and metrics endpoints confirmed
- [ ] Final production-ready approval granted

## Notes

- 
`;

writeFileSync(outputPath, contents, 'utf8');
console.log(`Acceptance report template created: ${outputPath}`);
