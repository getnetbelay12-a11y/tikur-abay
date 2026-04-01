#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const outputDir = path.join(process.cwd(), 'reports');
const outputFile = path.join(outputDir, 'uat-feedback-template.csv');

const headers = [
  'role',
  'page',
  'task',
  'page_clarity',
  'missing_info',
  'duplicate_info',
  'broken_action',
  'confusing_workflow',
  'time_to_complete_seconds',
  'notes',
];

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, `${headers.join(',')}\n`, 'utf8');
console.log(`UAT feedback template exported to ${outputFile}`);
