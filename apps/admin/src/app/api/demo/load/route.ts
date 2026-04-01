import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { NextResponse } from 'next/server';
import { readDemoManifest } from '../../../../lib/demo-manifest';
import { demoScenarioToolsEnabled } from '../../../../lib/runtime-flags';

const execFileAsync = promisify(execFile);

function resolveRepoRoot() {
  const cwd = process.cwd();
  if (cwd.includes('/apps/admin')) {
    return resolve(cwd, '../..');
  }
  return cwd;
}

export const dynamic = 'force-dynamic';

export async function POST() {
  if (!demoScenarioToolsEnabled) {
    return NextResponse.json({ ok: false, message: 'Demo scenario tools are disabled in production.' }, { status: 403 });
  }

  const repoRoot = resolveRepoRoot();

  try {
    await execFileAsync('./scripts/run-with-local-env.sh', ['node', 'scripts/demo-scenario-loader.js'], {
      cwd: repoRoot,
      timeout: 240_000,
      env: process.env,
      maxBuffer: 1024 * 1024 * 8,
    });
    const manifest = await readDemoManifest();
    return NextResponse.json({ ok: true, manifest });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load demo scenarios';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
