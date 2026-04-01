"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongo_1 = require("../mongo");
const local_seed_service_1 = require("./local-seed.service");
async function run() {
    await (0, local_seed_service_1.resetLocalData)();
    console.log('Local seed data reset complete.');
    await (0, mongo_1.disconnectFromDatabase)();
}
void run().catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await (0, mongo_1.disconnectFromDatabase)();
    process.exit(1);
});
//# sourceMappingURL=reset-demo-seed.js.map