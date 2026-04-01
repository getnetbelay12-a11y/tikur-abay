"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maintenanceTrackingSchema = void 0;
exports.maintenanceTrackingSchema = {
    collections: [
        {
            collection: 'maintenance_plans',
            fields: {
                vehicleId: 'ObjectId',
                serviceItemName: 'string',
                intervalKm: 'number?',
                intervalDays: 'number?',
                criticalFlag: 'boolean',
                notificationDaysBeforeDue: 'number',
                blockTripAssignmentIfOverdue: 'boolean',
                lastServiceKm: 'number?',
                lastServiceDate: 'Date?',
                nextDueKm: 'number?',
                nextDueDate: 'Date?',
                status: 'active|paused|retired',
            },
            indexes: [
                'vehicleId + status',
                'nextDueKm',
                'nextDueDate',
                'criticalFlag + nextDueDate',
            ],
            rules: [
                'Initial tire inspection threshold is 4000 km',
                'Critical overdue plans block trip assignment',
            ],
        },
        {
            collection: 'maintenance_notifications',
            fields: {
                vehicleId: 'ObjectId',
                driverId: 'ObjectId?',
                maintenanceType: 'string',
                dueKm: 'number?',
                dueDate: 'Date?',
                message: 'string',
                status: 'pending|sent|read|resolved',
                sentBy: 'ObjectId',
                sentAt: 'Date',
                readAt: 'Date?',
            },
            indexes: [
                'vehicleId + sentAt desc',
                'driverId + status',
                'maintenanceType + status',
            ],
        },
    ],
};
//# sourceMappingURL=maintenance-tracking.schema.js.map