"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceService = void 0;
const common_1 = require("@nestjs/common");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
let PerformanceService = class PerformanceService {
    async getEmployeeSummary(query = {}, user) {
        await (0, mongo_1.connectToDatabase)();
        const match = this.buildEmployeeQuery(query, user);
        const [totals, branchWisePerformance, departmentWisePerformance, topPerformers, lowPerformers, trendOverTime] = await Promise.all([
            models_1.EmployeePerformanceMetricModel.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: null,
                        totalEmployeesMeasured: { $sum: 1 },
                        averageEmployeePerformanceScore: { $avg: '$performanceScore' },
                        totalLoadsHandled: { $sum: '$loadsHandled' },
                        totalTripsHandled: { $sum: '$tripsHandled' },
                        totalCustomersHandled: { $sum: '$customersHandled' },
                        agreementsHandled: { $sum: '$agreementsHandled' },
                        paymentsHandled: { $sum: '$paymentsHandled' },
                        issuesResolved: { $sum: '$issuesResolved' },
                        averageResponseTime: { $avg: '$avgResponseMinutes' },
                    },
                },
            ]),
            this.aggregateAverage(models_1.EmployeePerformanceMetricModel, match, '$branchName', '$performanceScore'),
            this.aggregateAverage(models_1.EmployeePerformanceMetricModel, match, '$department', '$performanceScore'),
            models_1.EmployeePerformanceMetricModel.find(match).sort(this.resolveEmployeeSort(query.sortBy || 'performanceScore', 'desc')).limit(3).lean(),
            models_1.EmployeePerformanceMetricModel.find(match).sort(this.resolveEmployeeSort(query.sortBy || 'performanceScore', 'asc')).limit(3).lean(),
            models_1.EmployeePerformanceMetricModel.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m', date: '$periodEnd' } },
                        averageScore: { $avg: '$performanceScore' },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
                { $limit: 6 },
            ]),
        ]);
        const summary = totals[0] ?? {};
        return {
            totalEmployeesMeasured: Number(summary.totalEmployeesMeasured ?? 0),
            averageEmployeePerformanceScore: this.round(summary.averageEmployeePerformanceScore),
            totalLoadsHandled: Number(summary.totalLoadsHandled ?? 0),
            totalTripsHandled: Number(summary.totalTripsHandled ?? 0),
            totalCustomersHandled: Number(summary.totalCustomersHandled ?? 0),
            agreementsHandled: Number(summary.agreementsHandled ?? 0),
            paymentsHandled: Number(summary.paymentsHandled ?? 0),
            issuesResolved: Number(summary.issuesResolved ?? 0),
            averageResponseTime: this.round(summary.averageResponseTime),
            branchWisePerformance,
            departmentWisePerformance,
            topPerformers,
            lowPerformers,
            trendOverTime: trendOverTime.map((row) => ({
                label: row._id,
                averageScore: this.round(row.averageScore),
                count: Number(row.count ?? 0),
            })),
        };
    }
    async getEmployeePerformance(query = {}, user) {
        await (0, mongo_1.connectToDatabase)();
        const match = this.buildEmployeeQuery(query, user);
        const page = query.page || 1;
        const pageSize = query.pageSize || 10;
        const [items, total] = await Promise.all([
            models_1.EmployeePerformanceMetricModel.find(match)
                .sort(this.resolveEmployeeSort(query.sortBy || 'performanceScore', query.sortOrder || 'desc'))
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            models_1.EmployeePerformanceMetricModel.countDocuments(match),
        ]);
        return { items, total, page, pageSize };
    }
    async getEmployeeById(id) {
        await (0, mongo_1.connectToDatabase)();
        const profile = await models_1.EmployeePerformanceMetricModel.findOne({
            $or: [{ employeeId: id }, { employeeCode: id }, { _id: id }],
        }).sort({ periodEnd: -1 }).lean();
        if (!profile)
            return null;
        const trendRows = await models_1.EmployeePerformanceMetricModel.find({
            $or: [{ employeeId: profile.employeeId }, { employeeCode: profile.employeeCode }],
        }).sort({ periodEnd: 1 }).limit(12).lean();
        return {
            ...profile,
            monthlyTrend: trendRows.map((row) => ({
                label: new Date(String(row.periodEnd)).toISOString().slice(0, 7),
                performanceScore: row.performanceScore,
                loadsHandled: row.loadsHandled,
                customersHandled: row.customersHandled,
            })),
        };
    }
    async getEmployeeActivity(id) {
        await (0, mongo_1.connectToDatabase)();
        const metric = await this.getEmployeeById(id);
        if (!metric)
            return [];
        const trips = await models_1.TripModel.find({ branchId: metric.branchId }).sort({ createdAt: -1 }).limit(6).lean();
        const payments = await models_1.PaymentModel.find({ branchId: metric.branchId }).sort({ paymentDate: -1 }).limit(4).lean();
        const activities = [
            ...trips.map((trip) => ({
                id: String(trip._id),
                type: 'trip',
                title: `${trip.tripCode} ${trip.status}`,
                at: trip.updatedAt ?? trip.createdAt,
            })),
            ...payments.map((payment) => ({
                id: String(payment._id),
                type: 'payment',
                title: `${payment.paymentCode} ${payment.status}`,
                at: payment.paymentDate,
            })),
        ];
        return activities.sort((a, b) => new Date(String(b.at)).getTime() - new Date(String(a.at)).getTime()).slice(0, 10);
    }
    async getEmployeeCustomers(id) {
        await (0, mongo_1.connectToDatabase)();
        const metric = await this.getEmployeeById(id);
        if (!metric)
            return [];
        return models_1.CustomerModel.find({ branchId: metric.branchId }).sort({ createdAt: -1 }).limit(12).lean();
    }
    async getEmployeeLoads(id) {
        await (0, mongo_1.connectToDatabase)();
        const metric = await this.getEmployeeById(id);
        if (!metric)
            return [];
        return models_1.TripModel.find({ branchId: metric.branchId }).sort({ createdAt: -1 }).limit(12).lean();
    }
    async getDriverSummary(query = {}, user) {
        await (0, mongo_1.connectToDatabase)();
        const match = this.buildDriverQuery(query, user);
        const [totals, branchWisePerformance, topDrivers, lowPerformingDrivers, trendOverTime] = await Promise.all([
            models_1.DriverPerformanceMetricModel.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: null,
                        totalActiveDrivers: {
                            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
                        },
                        averageDriverPerformanceScore: { $avg: '$performanceScore' },
                        totalTripsCompleted: { $sum: '$tripsCompleted' },
                        totalLoadsCompleted: { $sum: '$loadsCompleted' },
                        totalCustomersServed: { $sum: '$customersServed' },
                        onTimeDeliveries: { $sum: '$onTimeDeliveries' },
                        delayedTripCount: { $sum: '$delayedTrips' },
                        accidentCount: { $sum: '$accidentCount' },
                        breakdownCount: { $sum: '$breakdownCount' },
                        podComplianceRate: { $avg: '$podComplianceRate' },
                        documentComplianceRate: { $avg: '$documentComplianceRate' },
                        fuelRequestCount: { $sum: '$fuelRequestCount' },
                        maintenanceReportCount: { $sum: '$maintenanceReportCount' },
                    },
                },
            ]),
            this.aggregateAverage(models_1.DriverPerformanceMetricModel, match, '$branchName', '$performanceScore'),
            models_1.DriverPerformanceMetricModel.find(match).sort(this.resolveDriverSort(query.sortBy || 'performanceScore', 'desc')).limit(3).lean(),
            models_1.DriverPerformanceMetricModel.find(match).sort(this.resolveDriverSort(query.sortBy || 'performanceScore', 'asc')).limit(3).lean(),
            models_1.DriverPerformanceMetricModel.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m', date: '$periodEnd' } },
                        averageScore: { $avg: '$performanceScore' },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
                { $limit: 6 },
            ]),
        ]);
        const summary = totals[0] ?? {};
        return {
            totalActiveDrivers: Number(summary.totalActiveDrivers ?? 0),
            averageDriverPerformanceScore: this.round(summary.averageDriverPerformanceScore),
            totalTripsCompleted: Number(summary.totalTripsCompleted ?? 0),
            totalLoadsCompleted: Number(summary.totalLoadsCompleted ?? 0),
            totalCustomersServed: Number(summary.totalCustomersServed ?? 0),
            onTimeDeliveryRate: this.percentage(Number(summary.onTimeDeliveries ?? 0), Number(summary.totalTripsCompleted ?? 0)),
            delayedTripCount: Number(summary.delayedTripCount ?? 0),
            accidentCount: Number(summary.accidentCount ?? 0),
            breakdownCount: Number(summary.breakdownCount ?? 0),
            podComplianceRate: this.round(summary.podComplianceRate),
            documentComplianceRate: this.round(summary.documentComplianceRate),
            fuelRequestCount: Number(summary.fuelRequestCount ?? 0),
            maintenanceReportCount: Number(summary.maintenanceReportCount ?? 0),
            branchWisePerformance,
            topDrivers,
            lowPerformingDrivers,
            trendOverTime: trendOverTime.map((row) => ({
                label: row._id,
                averageScore: this.round(row.averageScore),
                count: Number(row.count ?? 0),
            })),
        };
    }
    async getDriverPerformance(query = {}, user) {
        await (0, mongo_1.connectToDatabase)();
        const match = this.buildDriverQuery(query, user);
        const page = query.page || 1;
        const pageSize = query.pageSize || 10;
        const [items, total] = await Promise.all([
            models_1.DriverPerformanceMetricModel.find(match)
                .sort(this.resolveDriverSort(query.sortBy || 'performanceScore', query.sortOrder || 'desc'))
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            models_1.DriverPerformanceMetricModel.countDocuments(match),
        ]);
        return { items, total, page, pageSize };
    }
    async getDriverById(id) {
        await (0, mongo_1.connectToDatabase)();
        const profile = await models_1.DriverPerformanceMetricModel.findOne({
            $or: [{ driverId: id }, { driverCode: id }, { _id: id }],
        }).sort({ periodEnd: -1 }).lean();
        if (!profile)
            return null;
        const trendRows = await models_1.DriverPerformanceMetricModel.find({
            $or: [{ driverId: profile.driverId }, { driverCode: profile.driverCode }],
        }).sort({ periodEnd: 1 }).limit(12).lean();
        return {
            ...profile,
            monthlyTrend: trendRows.map((row) => ({
                label: new Date(String(row.periodEnd)).toISOString().slice(0, 7),
                performanceScore: row.performanceScore,
                tripsCompleted: row.tripsCompleted,
                delayedTrips: row.delayedTrips,
            })),
        };
    }
    async getDriverTrips(id) {
        await (0, mongo_1.connectToDatabase)();
        const metric = await this.getDriverById(id);
        if (!metric)
            return [];
        return models_1.TripModel.find({ driverId: metric.driverId }).sort({ createdAt: -1 }).limit(20).lean();
    }
    async getDriverCustomers(id) {
        await (0, mongo_1.connectToDatabase)();
        const metric = await this.getDriverById(id);
        if (!metric)
            return [];
        const trips = await models_1.TripModel.find({ driverId: metric.driverId }).sort({ createdAt: -1 }).limit(20).lean();
        const customerIds = [...new Set(trips.map((trip) => String(trip.customerId)).filter(Boolean))];
        return models_1.CustomerModel.find({ _id: { $in: customerIds } }).limit(12).lean();
    }
    async getDriverIncidents(id) {
        await (0, mongo_1.connectToDatabase)();
        const metric = await this.getDriverById(id);
        if (!metric)
            return [];
        return models_1.DriverReportModel.find({ driverId: metric.driverId }).sort({ createdAt: -1 }).limit(20).lean();
    }
    exportCsv(rows) {
        if (!rows.length)
            return '';
        const headers = Object.keys(rows[0]);
        const lines = rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? '')).join(','));
        return [headers.join(','), ...lines].join('\n');
    }
    buildEmployeeQuery(query, user) {
        const scopedBranch = this.scopedBranch(query.branch, user);
        const mongoQuery = {};
        if (scopedBranch) {
            mongoQuery.$or = [{ branchName: scopedBranch }, { branchId: scopedBranch }];
        }
        if (query.department)
            mongoQuery.department = query.department;
        if (query.role)
            mongoQuery.role = query.role;
        if (query.status)
            mongoQuery.status = query.status;
        if (query.startDate || query.endDate) {
            mongoQuery.periodEnd = {};
            if (query.startDate)
                mongoQuery.periodEnd.$gte = new Date(query.startDate);
            if (query.endDate)
                mongoQuery.periodEnd.$lte = new Date(query.endDate);
        }
        if (query.q) {
            const pattern = this.safeRegex(query.q);
            mongoQuery.$and = [
                ...(mongoQuery.$and ?? []),
                {
                    $or: [
                        { name: pattern },
                        { employeeCode: pattern },
                        { role: pattern },
                        { department: pattern },
                        { branchName: pattern },
                    ],
                },
            ];
        }
        return mongoQuery;
    }
    buildDriverQuery(query, user) {
        const scopedBranch = this.scopedBranch(query.branch, user);
        const mongoQuery = {};
        if (scopedBranch) {
            mongoQuery.$or = [{ branchName: scopedBranch }, { branchId: scopedBranch }];
        }
        if (query.status)
            mongoQuery.status = query.status;
        if (query.startDate || query.endDate) {
            mongoQuery.periodEnd = {};
            if (query.startDate)
                mongoQuery.periodEnd.$gte = new Date(query.startDate);
            if (query.endDate)
                mongoQuery.periodEnd.$lte = new Date(query.endDate);
        }
        if (query.q) {
            const pattern = this.safeRegex(query.q);
            mongoQuery.$and = [
                ...(mongoQuery.$and ?? []),
                {
                    $or: [
                        { name: pattern },
                        { driverCode: pattern },
                        { vehicleCode: pattern },
                        { branchName: pattern },
                    ],
                },
            ];
        }
        if (query.routeScope === 'djibouti') {
            mongoQuery.branchName = /djibouti/i;
        }
        if (query.routeScope === 'local') {
            mongoQuery.branchName = { $not: /djibouti/i };
        }
        return mongoQuery;
    }
    scopedBranch(requestedBranch, user) {
        if (!user || user.permissions.includes('*') || ['executive', 'super_admin'].includes(user.role)) {
            return requestedBranch;
        }
        return user.branchId || user.branch;
    }
    resolveEmployeeSort(sortBy, sortOrder) {
        const direction = sortOrder === 'asc' ? 1 : -1;
        const fieldMap = {
            score: 'performanceScore',
            performanceScore: 'performanceScore',
            avgResponseMinutes: 'avgResponseMinutes',
        };
        const field = fieldMap[sortBy] || 'performanceScore';
        return { [field]: direction, periodEnd: -1, _id: 1 };
    }
    resolveDriverSort(sortBy, sortOrder) {
        const direction = sortOrder === 'asc' ? 1 : -1;
        const fieldMap = {
            score: 'performanceScore',
            performanceScore: 'performanceScore',
            onTimeDeliveryRate: 'onTimeDeliveries',
        };
        const field = fieldMap[sortBy] || 'performanceScore';
        return { [field]: direction, periodEnd: -1, _id: 1 };
    }
    async aggregateAverage(model, match, groupField, metricField) {
        const rows = await model.aggregate([
            { $match: match },
            {
                $group: {
                    _id: { $ifNull: [groupField, 'Unknown'] },
                    averageScore: { $avg: metricField },
                    count: { $sum: 1 },
                },
            },
            { $sort: { averageScore: -1, _id: 1 } },
        ]);
        return rows.map((row) => ({
            label: String(row._id ?? 'Unknown'),
            averageScore: this.round(row.averageScore),
            count: Number(row.count ?? 0),
        }));
    }
    sum(rows, key) {
        return rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);
    }
    average(rows, key) {
        if (!rows.length)
            return 0;
        return Number((this.sum(rows, key) / rows.length).toFixed(2));
    }
    round(value) {
        return Number(Number(value ?? 0).toFixed(2));
    }
    percentage(numerator, denominator) {
        if (!denominator)
            return 0;
        return Number(((numerator / denominator) * 100).toFixed(2));
    }
    safeRegex(input) {
        return new RegExp(input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }
};
exports.PerformanceService = PerformanceService;
exports.PerformanceService = PerformanceService = __decorate([
    (0, common_1.Injectable)()
], PerformanceService);
//# sourceMappingURL=performance.service.js.map