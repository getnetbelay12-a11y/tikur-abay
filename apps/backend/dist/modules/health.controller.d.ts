export declare class HealthController {
    health(): {
        status: string;
        service: string;
        database: {
            state: import("mongoose").ConnectionStates;
            connected: boolean;
            name: string | null;
        };
    };
    liveness(): {
        status: string;
    };
    readiness(): {
        status: string;
        database: {
            state: import("mongoose").ConnectionStates;
            connected: boolean;
            name: string | null;
        };
    };
}
