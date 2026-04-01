"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToDatabase = connectToDatabase;
exports.disconnectFromDatabase = disconnectFromDatabase;
exports.databaseHealth = databaseHealth;
const mongoose_1 = require("mongoose");
const config_1 = require("./config");
let connectionPromise = null;
async function connectToDatabase() {
    if (mongoose_1.default.connection.readyState === 1) {
        return mongoose_1.default;
    }
    if (!connectionPromise) {
        const { mongoUri } = (0, config_1.getRuntimeConfig)();
        connectionPromise = mongoose_1.default.connect(mongoUri, {
            serverSelectionTimeoutMS: 10_000,
            maxPoolSize: 20,
        });
    }
    try {
        return await connectionPromise;
    }
    catch (error) {
        connectionPromise = null;
        throw error;
    }
}
async function disconnectFromDatabase() {
    if (mongoose_1.default.connection.readyState !== 0) {
        await mongoose_1.default.disconnect();
    }
    connectionPromise = null;
}
function databaseHealth() {
    return {
        state: mongoose_1.default.connection.readyState,
        connected: mongoose_1.default.connection.readyState === 1,
        name: mongoose_1.default.connection.db?.databaseName ?? null,
    };
}
//# sourceMappingURL=mongo.js.map