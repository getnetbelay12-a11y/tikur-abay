import mongoose from 'mongoose';
export declare function connectToDatabase(): Promise<typeof mongoose>;
export declare function disconnectFromDatabase(): Promise<void>;
export declare function databaseHealth(): {
    state: mongoose.ConnectionStates;
    connected: boolean;
    name: string | null;
};
