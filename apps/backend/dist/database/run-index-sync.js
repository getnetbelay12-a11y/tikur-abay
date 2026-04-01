"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongo_1 = require("./mongo");
const models_1 = require("./models");
async function main() {
    await (0, mongo_1.connectToDatabase)();
    const vehiclesMissingGeo = await models_1.VehicleModel.find({
        currentLocation: { $exists: false },
        'lastKnownLocation.latitude': { $ne: null },
        'lastKnownLocation.longitude': { $ne: null },
    }).select('_id lastKnownLocation').lean();
    if (vehiclesMissingGeo.length) {
        await models_1.VehicleModel.bulkWrite(vehiclesMissingGeo.map((vehicle) => ({
            updateOne: {
                filter: { _id: vehicle._id },
                update: {
                    $set: {
                        currentLocation: {
                            type: 'Point',
                            coordinates: [Number(vehicle.lastKnownLocation.longitude), Number(vehicle.lastKnownLocation.latitude)],
                        },
                    },
                },
            },
        })));
    }
    const gpsMissingGeo = await models_1.GpsPointModel.find({
        location: { $exists: false },
        latitude: { $ne: null },
        longitude: { $ne: null },
    }).select('_id latitude longitude').lean();
    for (let index = 0; index < gpsMissingGeo.length; index += 2000) {
        const chunk = gpsMissingGeo.slice(index, index + 2000);
        await models_1.GpsPointModel.bulkWrite(chunk.map((point) => ({
            updateOne: {
                filter: { _id: point._id },
                update: {
                    $set: {
                        location: {
                            type: 'Point',
                            coordinates: [Number(point.longitude), Number(point.latitude)],
                        },
                    },
                },
            },
        })));
    }
    const targets = [
        models_1.VehicleModel,
        models_1.TripModel,
        models_1.GpsPointModel,
        models_1.MaintenancePlanModel,
        models_1.RepairOrderModel,
        models_1.MaintenanceNotificationModel,
        models_1.DriverReportModel,
        models_1.InvoiceModel,
        models_1.PaymentModel,
        models_1.CorridorShipmentModel,
        models_1.CorridorPartyAccessModel,
        models_1.CorridorDocumentModel,
        models_1.CorridorDocumentAccessLogModel,
        models_1.CorridorContainerModel,
        models_1.CorridorMilestoneModel,
        models_1.CorridorExceptionModel,
        models_1.CorridorTripAssignmentModel,
        models_1.CorridorCheckpointEventModel,
        models_1.CorridorEmptyReturnModel,
        models_1.BankDocumentModel,
        models_1.ChargeInvoiceModel,
        models_1.ChargeInvoiceLineModel,
        models_1.CustomerPaymentReceiptModel,
        models_1.FinanceVerificationModel,
        models_1.FinancialClearanceModel,
        models_1.ReleaseAuthorizationModel,
        models_1.OfficialReceiptModel,
        models_1.ContainerInterchangeModel,
        models_1.DriverExpenseClaimModel,
        models_1.DriverExpenseItemModel,
        models_1.DriverReimbursementModel,
        models_1.ApprovalActionModel,
        models_1.EmployeePerformanceMetricModel,
        models_1.DriverPerformanceMetricModel,
        models_1.CustomerModel,
        models_1.NotificationModel,
        models_1.NotificationEventModel,
    ];
    const summary = [];
    for (const model of targets) {
        const result = await model.syncIndexes();
        summary.push({
            collection: model.collection.collectionName,
            syncedIndexes: result,
        });
    }
    console.log(JSON.stringify(summary, null, 2));
}
main()
    .catch((error) => {
    console.error(error);
    process.exitCode = 1;
})
    .finally(async () => {
    await (0, mongo_1.disconnectFromDatabase)();
});
//# sourceMappingURL=run-index-sync.js.map