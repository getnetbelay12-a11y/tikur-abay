"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceSchema = void 0;
exports.performanceSchema = {
    collections: [
        {
            collection: 'performance_reviews',
            fields: {
                employeeId: 'ObjectId?',
                driverId: 'ObjectId?',
                reviewPeriod: 'string',
                reviewerId: 'ObjectId',
                role: 'driver|dispatcher|technical_manager|operations_manager|finance_officer',
                score: 'number',
                kpiDetails: 'object',
                comments: 'string?',
                createdAt: 'Date',
                updatedAt: 'Date',
            },
            indexes: [
                'driverId + reviewPeriod',
                'employeeId + reviewPeriod',
                'role + score desc',
            ],
        },
        {
            collection: 'employee_performance_metrics',
            fields: {
                employeeId: 'ObjectId',
                periodStart: 'Date',
                periodEnd: 'Date',
                branchId: 'ObjectId',
                department: 'string',
                loadsHandled: 'number',
                tripsHandled: 'number',
                customersHandled: 'number',
                agreementsHandled: 'number',
                paymentsHandled: 'number',
                issuesResolved: 'number',
                avgResponseMinutes: 'number',
                performanceScore: 'number',
            },
            indexes: [
                'employeeId + periodStart + periodEnd',
                'branchId + department + periodStart',
                'performanceScore desc',
            ],
        },
        {
            collection: 'driver_performance_metrics',
            fields: {
                driverId: 'ObjectId',
                vehicleId: 'ObjectId',
                periodStart: 'Date',
                periodEnd: 'Date',
                branchId: 'ObjectId',
                tripsCompleted: 'number',
                loadsCompleted: 'number',
                customersServed: 'number',
                onTimeDeliveries: 'number',
                delayedTrips: 'number',
                accidentCount: 'number',
                breakdownCount: 'number',
                fuelRequestCount: 'number',
                maintenanceReportCount: 'number',
                podComplianceRate: 'number',
                documentComplianceRate: 'number',
                performanceScore: 'number',
            },
            indexes: [
                'driverId + periodStart + periodEnd',
                'branchId + periodStart',
                'performanceScore desc',
            ],
        },
    ],
};
//# sourceMappingURL=performance.schema.js.map