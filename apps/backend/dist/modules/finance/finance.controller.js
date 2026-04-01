"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const mongo_1 = require("../../database/mongo");
const models_1 = require("../../database/models");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const permissions_decorator_1 = require("../auth/permissions.decorator");
let FinanceController = class FinanceController {
    async unpaidInvoices(user) {
        await (0, mongo_1.connectToDatabase)();
        const query = {
            status: { $in: ['pending', 'partially_paid', 'overdue'] },
        };
        if (!user.permissions.includes('*') && !['executive', 'super_admin', 'finance_officer'].includes(user.role)) {
            query.branchId = user.branchId;
        }
        return models_1.InvoiceModel.find(query)
            .sort({ dueDate: 1 })
            .limit(20)
            .select('invoiceCode customerName outstandingAmount status dueDate tripCode')
            .lean();
    }
    async workspace(user) {
        await (0, mongo_1.connectToDatabase)();
        const scope = !user.permissions.includes('*') && !['executive', 'super_admin', 'finance_officer'].includes(user.role)
            ? { branchId: user.branchId }
            : {};
        const [invoices, payments, collections, trips, fuelLogs, rentalTrips, employees, drivers, customers, customerProfiles] = await Promise.all([
            models_1.InvoiceModel.find(scope).sort({ dueDate: 1 }).limit(240).lean(),
            models_1.PaymentModel.find(scope).sort({ paymentDate: -1 }).limit(240).lean(),
            models_1.CollectionTaskModel.find(scope).sort({ dueDate: 1 }).limit(160).lean(),
            models_1.TripModel.find(scope).sort({ createdAt: -1 }).limit(320).lean(),
            models_1.FuelLogModel.find(scope).sort({ date: -1 }).limit(320).lean(),
            models_1.RentalPartnerTripModel.find().sort({ assignedAt: -1 }).limit(160).lean(),
            models_1.EmployeeModel.find().limit(200).lean(),
            models_1.DriverModel.find().limit(200).lean(),
            models_1.CustomerModel.find().select('_id customerCode companyName').limit(240).lean(),
            models_1.CustomerProfileModel.find().select('customerId companyName contactPerson phone').limit(240).lean(),
        ]);
        const now = new Date();
        const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const paymentsToday = payments.filter((payment) => sameDay(payment.paymentDate, now));
        const revenueMtd = payments
            .filter((payment) => new Date(String(payment.paymentDate || 0)).getTime() >= monthStart.getTime() && String(payment.status) === 'paid')
            .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
        const outstandingRows = invoices.filter((invoice) => Number(invoice.outstandingAmount || 0) > 0);
        const overdueRows = outstandingRows.filter((invoice) => invoice.dueDate && new Date(String(invoice.dueDate)).getTime() < now.getTime());
        const profitabilityByRoute = new Map();
        for (const trip of trips) {
            const routeKey = trip.routeName || 'Unknown route';
            const current = profitabilityByRoute.get(routeKey) || { revenue: 0, invoiceCount: 0, fuelCost: 0, rentalCost: 0 };
            current.revenue += Number(trip.revenueAmount || 0);
            current.invoiceCount += 1;
            profitabilityByRoute.set(routeKey, current);
        }
        for (const log of fuelLogs) {
            const trip = trips.find((item) => String(item._id) === String(log.tripId));
            const routeKey = trip?.routeName || 'Unknown route';
            const current = profitabilityByRoute.get(routeKey) || { revenue: 0, invoiceCount: 0, fuelCost: 0, rentalCost: 0 };
            current.fuelCost += Number(log.cost || 0);
            profitabilityByRoute.set(routeKey, current);
        }
        for (const rentalTrip of rentalTrips) {
            const trip = trips.find((item) => String(item._id) === String(rentalTrip.tripId));
            const routeKey = trip?.routeName || 'Unknown route';
            const current = profitabilityByRoute.get(routeKey) || { revenue: 0, invoiceCount: 0, fuelCost: 0, rentalCost: 0 };
            current.rentalCost += Number(rentalTrip.rentalCost || 0);
            profitabilityByRoute.set(routeKey, current);
        }
        const routeProfitability = Array.from(profitabilityByRoute.entries())
            .map(([route, totals]) => ({
            route,
            revenue: totals.revenue,
            directCost: totals.fuelCost + totals.rentalCost,
            margin: totals.revenue - totals.fuelCost - totals.rentalCost,
            invoiceCount: totals.invoiceCount,
        }))
            .sort((left, right) => right.margin - left.margin)
            .slice(0, 8);
        const salaryRows = [
            {
                role: 'Operations payroll',
                headcount: employees.filter((employee) => String(employee.department) === 'Operations').length || 6,
                payoutDue: (employees.filter((employee) => String(employee.department) === 'Operations').length || 6) * 18500,
                commissionDue: drivers.length * 1200,
            },
            {
                role: 'Drivers and dispatch',
                headcount: drivers.length,
                payoutDue: drivers.length * 16500,
                commissionDue: trips.filter((trip) => String(trip.status) === 'completed').length * 950,
            },
            {
                role: 'Commercial and finance',
                headcount: employees.filter((employee) => ['Marketing', 'Finance'].includes(String(employee.department))).length || 5,
                payoutDue: (employees.filter((employee) => ['Marketing', 'Finance'].includes(String(employee.department))).length || 5) * 17250,
                commissionDue: paymentsToday.length * 400,
            },
        ];
        const customerMap = new Map(customers.flatMap((customer) => {
            const entries = [];
            if (customer._id)
                entries.push([String(customer._id), customer]);
            if (customer.customerCode)
                entries.push([String(customer.customerCode), customer]);
            if (customer.companyName)
                entries.push([String(customer.companyName), customer]);
            return entries;
        }));
        const customerProfileMap = new Map(customerProfiles.flatMap((profile) => {
            const entries = [];
            if (profile.customerId)
                entries.push([String(profile.customerId), profile]);
            if (profile.companyName)
                entries.push([String(profile.companyName), profile]);
            return entries;
        }));
        const prioritizedPayments = [
            ...(payments.filter((payment) => String(payment.status) === 'paid').slice(0, 16)),
            ...(payments.filter((payment) => String(payment.status) !== 'paid').slice(0, 16)),
        ];
        const recentPayments = prioritizedPayments
            .filter((payment, index, rows) => rows.findIndex((candidate) => String(candidate._id) === String(payment._id)) === index)
            .slice(0, 24);
        return {
            kpis: {
                revenueMtd,
                outstandingInvoices: outstandingRows.reduce((sum, invoice) => sum + Number(invoice.outstandingAmount || 0), 0),
                overdueInvoices: overdueRows.length,
                paymentsToday: paymentsToday.length,
                collectionsRequiringFollowUp: collections.filter((task) => ['open', 'escalated'].includes(String(task.status))).length,
                payoutsDue: salaryRows.reduce((sum, row) => sum + row.payoutDue + row.commissionDue, 0),
            },
            outstandingInvoices: outstandingRows.map((invoice) => ({
                ...(resolveCustomerContact(invoice, customerMap, customerProfileMap)),
                id: String(invoice._id),
                invoiceCode: invoice.invoiceCode || 'Invoice',
                customerName: invoice.customerName || 'Customer pending',
                routeName: invoice.routeName || 'Route pending',
                outstandingAmount: Number(invoice.outstandingAmount || 0),
                totalAmount: Number(invoice.totalAmount || 0),
                status: invoice.status || 'pending',
                dueDate: invoice.dueDate || null,
                tripCode: invoice.tripCode || 'Trip pending',
            })),
            recentPayments: recentPayments.map((payment) => ({
                id: String(payment._id),
                paymentCode: payment.paymentCode || 'Payment',
                customerCode: payment.customerCode || 'Customer',
                amount: Number(payment.amount || 0),
                status: payment.status || 'paid',
                routeName: payment.routeName || 'Route pending',
                paymentDate: payment.paymentDate || null,
            })),
            collectionsQueue: collections.map((task) => ({
                id: String(task._id),
                taskCode: task.taskCode || 'Collection',
                customerName: task.customerName || 'Customer pending',
                assignedOwner: task.assignedOwner || 'Finance desk',
                escalationLevel: task.escalationLevel || 'finance_officer',
                balance: Number(task.balance || 0),
                reminderCount: Number(task.reminderCount || 0),
                status: task.status || 'open',
                dueDate: task.dueDate || null,
                lastFollowUpAt: task.lastFollowUpAt || null,
            })),
            routeProfitability,
            salarySummary: salaryRows,
        };
    }
};
exports.FinanceController = FinanceController;
__decorate([
    (0, common_1.Get)('unpaid-invoices'),
    (0, permissions_decorator_1.Permissions)('payments:view', 'dashboards:executive:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "unpaidInvoices", null);
__decorate([
    (0, common_1.Get)('workspace'),
    (0, permissions_decorator_1.Permissions)('payments:view', 'invoices:view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "workspace", null);
exports.FinanceController = FinanceController = __decorate([
    (0, swagger_1.ApiTags)('finance'),
    (0, common_1.Controller)('finance')
], FinanceController);
function resolveCustomerContact(invoice, customerMap, customerProfileMap) {
    const customer = customerMap.get(String(invoice.customerId || '')) ||
        customerMap.get(String(invoice.customerCode || '')) ||
        customerMap.get(String(invoice.customerName || ''));
    const profile = customerProfileMap.get(String(invoice.customerId || '')) ||
        customerProfileMap.get(String(customer?._id || '')) ||
        customerProfileMap.get(String(invoice.customerName || '')) ||
        customerProfileMap.get(String(customer?.companyName || ''));
    return {
        contactPerson: profile?.contactPerson || 'Account contact pending',
        contactPhone: profile?.phone || 'Phone pending',
    };
}
function sameDay(value, now) {
    if (!value)
        return false;
    const date = new Date(String(value));
    return date.getUTCFullYear() === now.getUTCFullYear() &&
        date.getUTCMonth() === now.getUTCMonth() &&
        date.getUTCDate() === now.getUTCDate();
}
//# sourceMappingURL=finance.controller.js.map