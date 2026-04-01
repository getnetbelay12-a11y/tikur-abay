"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const node_path_1 = require("node:path");
const mongo_1 = require("../mongo");
const local_seed_service_1 = require("./local-seed.service");
(0, dotenv_1.config)({ path: (0, node_path_1.resolve)(process.cwd(), '.env') });
(0, dotenv_1.config)({ path: (0, node_path_1.resolve)(process.cwd(), '../../.env'), override: false });
async function run() {
    const result = await (0, local_seed_service_1.seedLocalData)();
    console.log(JSON.stringify(result, null, 2));
    await (0, mongo_1.disconnectFromDatabase)();
}
void run().catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await (0, mongo_1.disconnectFromDatabase)();
    process.exit(1);
});
//# sourceMappingURL=run-local-seed.js.map