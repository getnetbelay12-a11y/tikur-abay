// @ts-nocheck
import { connectToDatabase, disconnectFromDatabase } from './mongo';
import {
  ApprovalActionModel,
  BankDocumentModel,
  ChargeInvoiceLineModel,
  ChargeInvoiceModel,
  ContainerInterchangeModel,
  CorridorCheckpointEventModel,
  CorridorContainerModel,
  CorridorDocumentAccessLogModel,
  CorridorDocumentModel,
  CorridorEmptyReturnModel,
  CorridorExceptionModel,
  CorridorMilestoneModel,
  CorridorPartyAccessModel,
  CorridorShipmentModel,
  CorridorTripAssignmentModel,
  CustomerModel,
  CustomerPaymentReceiptModel,
  DriverExpenseClaimModel,
  DriverExpenseItemModel,
  DriverPerformanceMetricModel,
  DriverReimbursementModel,
  DriverReportModel,
  EmployeePerformanceMetricModel,
  FinancialClearanceModel,
  FinanceVerificationModel,
  GpsPointModel,
  InvoiceModel,
  MaintenanceNotificationModel,
  MaintenancePlanModel,
  NotificationEventModel,
  NotificationModel,
  OfficialReceiptModel,
  PaymentModel,
  RepairOrderModel,
  ReleaseAuthorizationModel,
  TripModel,
  VehicleModel,
} from './models';

async function main() {
  await connectToDatabase();

  const vehiclesMissingGeo = await VehicleModel.find({
    currentLocation: { $exists: false },
    'lastKnownLocation.latitude': { $ne: null },
    'lastKnownLocation.longitude': { $ne: null },
  }).select('_id lastKnownLocation').lean();

  if (vehiclesMissingGeo.length) {
    await VehicleModel.bulkWrite(
      vehiclesMissingGeo.map((vehicle) => ({
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
      })),
    );
  }

  const gpsMissingGeo = await GpsPointModel.find({
    location: { $exists: false },
    latitude: { $ne: null },
    longitude: { $ne: null },
  }).select('_id latitude longitude').lean();

  for (let index = 0; index < gpsMissingGeo.length; index += 2000) {
    const chunk = gpsMissingGeo.slice(index, index + 2000);
    await GpsPointModel.bulkWrite(
      chunk.map((point) => ({
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
      })),
    );
  }

  const targets = [
    VehicleModel,
    TripModel,
    GpsPointModel,
    MaintenancePlanModel,
    RepairOrderModel,
    MaintenanceNotificationModel,
    DriverReportModel,
    InvoiceModel,
    PaymentModel,
    CorridorShipmentModel,
    CorridorPartyAccessModel,
    CorridorDocumentModel,
    CorridorDocumentAccessLogModel,
    CorridorContainerModel,
    CorridorMilestoneModel,
    CorridorExceptionModel,
    CorridorTripAssignmentModel,
    CorridorCheckpointEventModel,
    CorridorEmptyReturnModel,
    BankDocumentModel,
    ChargeInvoiceModel,
    ChargeInvoiceLineModel,
    CustomerPaymentReceiptModel,
    FinanceVerificationModel,
    FinancialClearanceModel,
    ReleaseAuthorizationModel,
    OfficialReceiptModel,
    ContainerInterchangeModel,
    DriverExpenseClaimModel,
    DriverExpenseItemModel,
    DriverReimbursementModel,
    ApprovalActionModel,
    EmployeePerformanceMetricModel,
    DriverPerformanceMetricModel,
    CustomerModel,
    NotificationModel,
    NotificationEventModel,
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
    await disconnectFromDatabase();
  });
