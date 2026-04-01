import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { disconnectFromDatabase } from '../mongo';
import { seedLocalData } from './local-seed.service';

loadEnv({ path: resolve(process.cwd(), '.env') });
loadEnv({ path: resolve(process.cwd(), '../../.env'), override: false });

async function run() {
  const result = await seedLocalData();
  console.log(JSON.stringify(result, null, 2));
  await disconnectFromDatabase();
}

void run().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await disconnectFromDatabase();
  process.exit(1);
});
