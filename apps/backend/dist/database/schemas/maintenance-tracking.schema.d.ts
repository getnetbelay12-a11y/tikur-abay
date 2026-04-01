export declare const maintenanceTrackingSchema: {
    readonly collections: readonly [{
        readonly collection: "maintenance_plans";
        readonly fields: {
            readonly vehicleId: "ObjectId";
            readonly serviceItemName: "string";
            readonly intervalKm: "number?";
            readonly intervalDays: "number?";
            readonly criticalFlag: "boolean";
            readonly notificationDaysBeforeDue: "number";
            readonly blockTripAssignmentIfOverdue: "boolean";
            readonly lastServiceKm: "number?";
            readonly lastServiceDate: "Date?";
            readonly nextDueKm: "number?";
            readonly nextDueDate: "Date?";
            readonly status: "active|paused|retired";
        };
        readonly indexes: readonly ["vehicleId + status", "nextDueKm", "nextDueDate", "criticalFlag + nextDueDate"];
        readonly rules: readonly ["Initial tire inspection threshold is 4000 km", "Critical overdue plans block trip assignment"];
    }, {
        readonly collection: "maintenance_notifications";
        readonly fields: {
            readonly vehicleId: "ObjectId";
            readonly driverId: "ObjectId?";
            readonly maintenanceType: "string";
            readonly dueKm: "number?";
            readonly dueDate: "Date?";
            readonly message: "string";
            readonly status: "pending|sent|read|resolved";
            readonly sentBy: "ObjectId";
            readonly sentAt: "Date";
            readonly readAt: "Date?";
        };
        readonly indexes: readonly ["vehicleId + sentAt desc", "driverId + status", "maintenanceType + status"];
    }];
};
