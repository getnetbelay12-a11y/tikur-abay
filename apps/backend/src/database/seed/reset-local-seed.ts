import { disconnectFromDatabase } from '../mongo';
import { resetLocalData } from './local-seed.service';

async function run() {
  await resetLocalData();
  console.log('Local seed data reset complete.');
  await disconnectFromDatabase();
}

void run().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await disconnectFromDatabase();
  process.exit(1);
});
