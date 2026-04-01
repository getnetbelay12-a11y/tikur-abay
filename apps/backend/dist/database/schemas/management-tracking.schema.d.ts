export declare const managementTrackingSchema: {
    readonly collection: "gps_points";
    readonly fields: {
        readonly tripId: "ObjectId";
        readonly vehicleId: "ObjectId";
        readonly driverId: "ObjectId?";
        readonly latitude: "number";
        readonly longitude: "number";
        readonly speed: "number";
        readonly heading: "number";
        readonly accuracy: "number";
        readonly recordedAt: "Date";
        readonly source: "driver_app|gps_device|manual";
        readonly geofence: "origin|destination|border|djibouti|checkpoint|en_route";
        readonly branch: "string";
        readonly routeName: "string";
        readonly tripStatus: "string";
        readonly vehicleStatus: "string";
    };
    readonly indexes: readonly ["vehicleId + recordedAt desc", "tripId + recordedAt desc", "branch + tripStatus + recordedAt desc", "2dsphere(location)"];
    readonly rules: readonly ["GPS points are append-only", "Driver app sends points in the background during active trips only", "Live map visibility is restricted to management and operations consoles"];
};
