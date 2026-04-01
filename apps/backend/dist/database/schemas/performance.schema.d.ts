export declare const performanceSchema: {
    readonly collections: readonly [{
        readonly collection: "performance_reviews";
        readonly fields: {
            readonly employeeId: "ObjectId?";
            readonly driverId: "ObjectId?";
            readonly reviewPeriod: "string";
            readonly reviewerId: "ObjectId";
            readonly role: "driver|dispatcher|technical_manager|operations_manager|finance_officer";
            readonly score: "number";
            readonly kpiDetails: "object";
            readonly comments: "string?";
            readonly createdAt: "Date";
            readonly updatedAt: "Date";
        };
        readonly indexes: readonly ["driverId + reviewPeriod", "employeeId + reviewPeriod", "role + score desc"];
    }, {
        readonly collection: "employee_performance_metrics";
        readonly fields: {
            readonly employeeId: "ObjectId";
            readonly periodStart: "Date";
            readonly periodEnd: "Date";
            readonly branchId: "ObjectId";
            readonly department: "string";
            readonly loadsHandled: "number";
            readonly tripsHandled: "number";
            readonly customersHandled: "number";
            readonly agreementsHandled: "number";
            readonly paymentsHandled: "number";
            readonly issuesResolved: "number";
            readonly avgResponseMinutes: "number";
            readonly performanceScore: "number";
        };
        readonly indexes: readonly ["employeeId + periodStart + periodEnd", "branchId + department + periodStart", "performanceScore desc"];
    }, {
        readonly collection: "driver_performance_metrics";
        readonly fields: {
            readonly driverId: "ObjectId";
            readonly vehicleId: "ObjectId";
            readonly periodStart: "Date";
            readonly periodEnd: "Date";
            readonly branchId: "ObjectId";
            readonly tripsCompleted: "number";
            readonly loadsCompleted: "number";
            readonly customersServed: "number";
            readonly onTimeDeliveries: "number";
            readonly delayedTrips: "number";
            readonly accidentCount: "number";
            readonly breakdownCount: "number";
            readonly fuelRequestCount: "number";
            readonly maintenanceReportCount: "number";
            readonly podComplianceRate: "number";
            readonly documentComplianceRate: "number";
            readonly performanceScore: "number";
        };
        readonly indexes: readonly ["driverId + periodStart + periodEnd", "branchId + periodStart", "performanceScore desc"];
    }];
};
