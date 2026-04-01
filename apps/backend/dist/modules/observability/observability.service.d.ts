export declare class ObservabilityService {
    getSummary(): Promise<{
        generatedAt: string;
        fleet: {
            byStatus: Record<string, number>;
            activeTrips: number;
            delayedTrips: number;
            blockedVehicles: number;
        };
        maintenance: {
            due: number;
            notificationsOpen: number;
        };
        incidents: {
            open: number;
            driverReportsOpen: number;
        };
        finance: {
            overdueInvoices: number;
            escalatedCollections: number;
            paymentsToday: number;
        };
        documents: {
            documentsToday: number;
            uploadedDocumentsToday: number;
        };
        activity: {
            activityFeedToday: number;
            fuelActivityToday: number;
            chatMessagesToday: number;
            unreadNotifications: number;
        };
        commercial: {
            agreementsAwaitingSignature: number;
            signedAgreementsThisWeek: number;
        };
        hr: {
            activeCandidates: number;
            averageEmployeePerformance: string;
        };
    }>;
    getPrometheusText(): Promise<string>;
}
