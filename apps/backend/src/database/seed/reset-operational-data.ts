import { disconnectFromDatabase } from '../mongo';
import { resetOperationalData } from './local-seed.service';

async function run() {
  await resetOperationalData();
  console.log('Operational data reset complete.');
  await disconnectFromDatabase();
}

void run().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await disconnectFromDatabase();
  process.exit(1);
});
