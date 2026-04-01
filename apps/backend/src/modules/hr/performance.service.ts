// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { connectToDatabase } from '../../database/mongo';
import {
  CustomerModel,
  DriverPerformanceMetricModel,
  DriverReportModel,
  EmployeePerformanceMetricModel,
  PaymentModel,
  TripModel,
} from '../../database/models';
import { AuthenticatedUser } from '../auth/auth.types';
import { PerformanceQueryDto } from './dto/performance-query.dto';

@Injectable()
export class PerformanceService {
  async getEmployeeSummary(query: PerformanceQueryDto = {}, user?: AuthenticatedUser) {
    await connectToDatabase();
    const match = this.buildEmployeeQuery(query, user);
    const [totals, branchWisePerformance, departmentWisePerformance, topPerformers, lowPerformers, trendOverTime] = await Promise.all([
      EmployeePerformanceMetricModel.aggregate([
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
      this.aggregateAverage(EmployeePerformanceMetricModel, match, '$branchName', '$performanceScore'),
      this.aggregateAverage(EmployeePerformanceMetricModel, match, '$department', '$performanceScore'),
      EmployeePerformanceMetricModel.find(match).sort(this.resolveEmployeeSort(query.sortBy || 'performanceScore', 'desc')).limit(3).lean(),
      EmployeePerformanceMetricModel.find(match).sort(this.resolveEmployeeSort(query.sortBy || 'performanceScore', 'asc')).limit(3).lean(),
      EmployeePerformanceMetricModel.aggregate([
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

  async getEmployeePerformance(query: PerformanceQueryDto = {}, user?: AuthenticatedUser) {
    await connectToDatabase();
    const match = this.buildEmployeeQuery(query, user);
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    const [items, total] = await Promise.all([
      EmployeePerformanceMetricModel.find(match)
        .sort(this.resolveEmployeeSort(query.sortBy || 'performanceScore', query.sortOrder || 'desc'))
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      EmployeePerformanceMetricModel.countDocuments(match),
    ]);
    return { items, total, page, pageSize };
  }

  async getEmployeeById(id: string) {
    await connectToDatabase();
    const profile = await EmployeePerformanceMetricModel.findOne({
      $or: [{ employeeId: id }, { employeeCode: id }, { _id: id }],
    }).sort({ periodEnd: -1 }).lean();
    if (!profile) return null;
    const trendRows = await EmployeePerformanceMetricModel.find({
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

  async getEmployeeActivity(id: string) {
    await connectToDatabase();
    const metric = await this.getEmployeeById(id);
    if (!metric) return [];
    const trips = await TripModel.find({ branchId: metric.branchId }).sort({ createdAt: -1 }).limit(6).lean();
    const payments = await PaymentModel.find({ branchId: metric.branchId }).sort({ paymentDate: -1 }).limit(4).lean();
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

  async getEmployeeCustomers(id: string) {
    await connectToDatabase();
    const metric = await this.getEmployeeById(id);
    if (!metric) return [];
    return CustomerModel.find({ branchId: metric.branchId }).sort({ createdAt: -1 }).limit(12).lean();
  }

  async getEmployeeLoads(id: string) {
    await connectToDatabase();
    const metric = await this.getEmployeeById(id);
    if (!metric) return [];
    return TripModel.find({ branchId: metric.branchId }).sort({ createdAt: -1 }).limit(12).lean();
  }

  async getDriverSummary(query: PerformanceQueryDto = {}, user?: AuthenticatedUser) {
    await connectToDatabase();
    const match = this.buildDriverQuery(query, user);
    const [totals, branchWisePerformance, topDrivers, lowPerformingDrivers, trendOverTime] = await Promise.all([
      DriverPerformanceMetricModel.aggregate([
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
      this.aggregateAverage(DriverPerformanceMetricModel, match, '$branchName', '$performanceScore'),
      DriverPerformanceMetricModel.find(match).sort(this.resolveDriverSort(query.sortBy || 'performanceScore', 'desc')).limit(3).lean(),
      DriverPerformanceMetricModel.find(match).sort(this.resolveDriverSort(query.sortBy || 'performanceScore', 'asc')).limit(3).lean(),
      DriverPerformanceMetricModel.aggregate([
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

  async getDriverPerformance(query: PerformanceQueryDto = {}, user?: AuthenticatedUser) {
    await connectToDatabase();
    const match = this.buildDriverQuery(query, user);
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    const [items, total] = await Promise.all([
      DriverPerformanceMetricModel.find(match)
        .sort(this.resolveDriverSort(query.sortBy || 'performanceScore', query.sortOrder || 'desc'))
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      DriverPerformanceMetricModel.countDocuments(match),
    ]);
    return { items, total, page, pageSize };
  }

  async getDriverById(id: string) {
    await connectToDatabase();
    const profile = await DriverPerformanceMetricModel.findOne({
      $or: [{ driverId: id }, { driverCode: id }, { _id: id }],
    }).sort({ periodEnd: -1 }).lean();
    if (!profile) return null;
    const trendRows = await DriverPerformanceMetricModel.find({
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

  async getDriverTrips(id: string) {
    await connectToDatabase();
    const metric = await this.getDriverById(id);
    if (!metric) return [];
    return TripModel.find({ driverId: metric.driverId }).sort({ createdAt: -1 }).limit(20).lean();
  }

  async getDriverCustomers(id: string) {
    await connectToDatabase();
    const metric = await this.getDriverById(id);
    if (!metric) return [];
    const trips = await TripModel.find({ driverId: metric.driverId }).sort({ createdAt: -1 }).limit(20).lean();
    const customerIds = [...new Set(trips.map((trip) => String(trip.customerId)).filter(Boolean))];
    return CustomerModel.find({ _id: { $in: customerIds } }).limit(12).lean();
  }

  async getDriverIncidents(id: string) {
    await connectToDatabase();
    const metric = await this.getDriverById(id);
    if (!metric) return [];
    return DriverReportModel.find({ driverId: metric.driverId }).sort({ createdAt: -1 }).limit(20).lean();
  }

  exportCsv(rows: Record<string, unknown>[]) {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const lines = rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? '')).join(','));
    return [headers.join(','), ...lines].join('\n');
  }

  private buildEmployeeQuery(query: PerformanceQueryDto, user?: AuthenticatedUser) {
    const scopedBranch = this.scopedBranch(query.branch, user);
    const mongoQuery: Record<string, unknown> = {};
    if (scopedBranch) {
      mongoQuery.$or = [{ branchName: scopedBranch }, { branchId: scopedBranch }];
    }
    if (query.department) mongoQuery.department = query.department;
    if (query.role) mongoQuery.role = query.role;
    if (query.status) mongoQuery.status = query.status;
    if (query.startDate || query.endDate) {
      mongoQuery.periodEnd = {};
      if (query.startDate) mongoQuery.periodEnd.$gte = new Date(query.startDate);
      if (query.endDate) mongoQuery.periodEnd.$lte = new Date(query.endDate);
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

  private buildDriverQuery(query: PerformanceQueryDto, user?: AuthenticatedUser) {
    const scopedBranch = this.scopedBranch(query.branch, user);
    const mongoQuery: Record<string, unknown> = {};
    if (scopedBranch) {
      mongoQuery.$or = [{ branchName: scopedBranch }, { branchId: scopedBranch }];
    }
    if (query.status) mongoQuery.status = query.status;
    if (query.startDate || query.endDate) {
      mongoQuery.periodEnd = {};
      if (query.startDate) mongoQuery.periodEnd.$gte = new Date(query.startDate);
      if (query.endDate) mongoQuery.periodEnd.$lte = new Date(query.endDate);
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

  private scopedBranch(requestedBranch?: string, user?: AuthenticatedUser) {
    if (!user || user.permissions.includes('*') || ['executive', 'super_admin'].includes(user.role)) {
      return requestedBranch;
    }

    return user.branchId || user.branch;
  }

  private resolveEmployeeSort(sortBy: string, sortOrder: 'asc' | 'desc') {
    const direction = sortOrder === 'asc' ? 1 : -1;
    const fieldMap: Record<string, string> = {
      score: 'performanceScore',
      performanceScore: 'performanceScore',
      avgResponseMinutes: 'avgResponseMinutes',
    };
    const field = fieldMap[sortBy] || 'performanceScore';
    return { [field]: direction, periodEnd: -1, _id: 1 };
  }

  private resolveDriverSort(sortBy: string, sortOrder: 'asc' | 'desc') {
    const direction = sortOrder === 'asc' ? 1 : -1;
    const fieldMap: Record<string, string> = {
      score: 'performanceScore',
      performanceScore: 'performanceScore',
      onTimeDeliveryRate: 'onTimeDeliveries',
    };
    const field = fieldMap[sortBy] || 'performanceScore';
    return { [field]: direction, periodEnd: -1, _id: 1 };
  }

  private async aggregateAverage(model: any, match: Record<string, unknown>, groupField: string, metricField: string) {
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

  private sum<T extends Record<string, unknown>>(rows: T[], key: string) {
    return rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);
  }

  private average<T extends Record<string, unknown>>(rows: T[], key: string) {
    if (!rows.length) return 0;
    return Number((this.sum(rows, key) / rows.length).toFixed(2));
  }

  private round(value: unknown) {
    return Number(Number(value ?? 0).toFixed(2));
  }

  private percentage(numerator: number, denominator: number) {
    if (!denominator) return 0;
    return Number(((numerator / denominator) * 100).toFixed(2));
  }

  private safeRegex(input: string) {
    return new RegExp(input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }
}
