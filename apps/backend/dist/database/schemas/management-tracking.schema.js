"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.managementTrackingSchema = void 0;
exports.managementTrackingSchema = {
    collection: 'gps_points',
    fields: {
        tripId: 'ObjectId',
        vehicleId: 'ObjectId',
        driverId: 'ObjectId?',
        latitude: 'number',
        longitude: 'number',
        speed: 'number',
        heading: 'number',
        accuracy: 'number',
        recordedAt: 'Date',
        source: 'driver_app|gps_device|manual',
        geofence: 'origin|destination|border|djibouti|checkpoint|en_route',
        branch: 'string',
        routeName: 'string',
        tripStatus: 'string',
        vehicleStatus: 'string',
    },
    indexes: [
        'vehicleId + recordedAt desc',
        'tripId + recordedAt desc',
        'branch + tripStatus + recordedAt desc',
        '2dsphere(location)',
    ],
    rules: [
        'GPS points are append-only',
        'Driver app sends points in the background during active trips only',
        'Live map visibility is restricted to management and operations consoles',
    ],
};
//# sourceMappingURL=management-tracking.schema.js.map