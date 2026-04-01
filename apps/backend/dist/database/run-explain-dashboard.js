"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongo_1 = require("./mongo");
const models_1 = require("./models");
function winningStage(plan) {
    if (!plan)
        return null;
    if (plan.inputStage)
        return winningStage(plan.inputStage);
    if (plan.inputStages?.length)
        return winningStage(plan.inputStages[0]);
    return {
        stage: plan.stage,
        indexName: plan.indexName ?? null,
    };
}
async function main() {
    await (0, mongo_1.connectToDatabase)();
    const vehicle = await models_1.VehicleModel.findOne({}, { branchId: 1, currentTripId: 1, assignedDriverId: 1 }).lean();
    const trip = await models_1.TripModel.findOne({}, { vehicleId: 1, driverId: 1, customerId: 1 }).lean();
    const explains = {
        vehicles_live_map: await models_1.VehicleModel.find({
            currentStatus: { $in: ['assigned', 'loading', 'loaded', 'in_transit', 'at_checkpoint', 'at_border', 'in_djibouti', 'offloading', 'delayed', 'breakdown', 'under_maintenance'] },
            currentTripId: { $ne: null },
            ...(vehicle?.branchId ? { branchId: vehicle.branchId } : {}),
        })
            .sort({ lastGpsAt: -1 })
            .explain('executionStats'),
        trips_latest: await models_1.TripModel.find({
            status: { $in: ['in_transit', 'at_border', 'in_djibouti', 'offloading'] },
            ...(vehicle?.branchId ? { branchId: vehicle.branchId } : {}),
        })
            .sort({ updatedAt: -1 })
            .limit(8)
            .explain('executionStats'),
        maintenance_due: await models_1.MaintenancePlanModel.find({
            status: 'active',
            nextDueDate: { $lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
        })
            .sort({ nextDueDate: 1 })
            .limit(20)
            .explain('executionStats'),
        driver_reports_open: await models_1.DriverReportModel.find({
            status: { $in: ['submitted', 'under_review'] },
        })
            .sort({ createdAt: -1 })
            .limit(20)
            .explain('executionStats'),
        invoices_unpaid: await models_1.InvoiceModel.find({
            status: { $in: ['pending', 'partially_paid', 'overdue'] },
        })
            .sort({ dueDate: 1 })
            .limit(20)
            .explain('executionStats'),
        employee_performance: await models_1.EmployeePerformanceMetricModel.find({
            ...(vehicle?.branchId ? { branchId: vehicle.branchId } : {}),
        })
            .sort({ periodEnd: -1, performanceScore: -1 })
            .limit(20)
            .explain('executionStats'),
        driver_performance: await models_1.DriverPerformanceMetricModel.find({
            ...(vehicle?.branchId ? { branchId: vehicle.branchId } : {}),
        })
            .sort({ periodEnd: -1, performanceScore: -1 })
            .limit(20)
            .explain('executionStats'),
    };
    const summary = Object.fromEntries(Object.entries(explains).map(([key, explain]) => [
        key,
        {
            nReturned: explain.executionStats?.nReturned ?? null,
            totalDocsExamined: explain.executionStats?.totalDocsExamined ?? null,
            totalKeysExamined: explain.executionStats?.totalKeysExamined ?? null,
            winningPlan: winningStage(explain.queryPlanner?.winningPlan),
        },
    ]));
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
//# sourceMappingURL=run-explain-dashboard.js.map