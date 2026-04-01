import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { connectToDatabase } from '../../database/mongo';
import { CollectionTaskModel, CustomerModel, CustomerProfileModel, DriverModel, EmployeeModel, FuelLogModel, InvoiceModel, PaymentModel, RentalPartnerTripModel, TripModel } from '../../database/models';
import { CurrentUser } from '../auth/current-user.decorator';
import { Permissions } from '../auth/permissions.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('finance')
@Controller('finance')
export class FinanceController {
  @Get('unpaid-invoices')
  @Permissions('payments:view', 'dashboards:executive:view')
  async unpaidInvoices(@CurrentUser() user: AuthenticatedUser) {
    await connectToDatabase();
    const query: Record<string, unknown> = {
      status: { $in: ['pending', 'partially_paid', 'overdue'] },
    };
    if (!user.permissions.includes('*') && !['executive', 'super_admin', 'finance_officer'].includes(user.role)) {
      query.branchId = user.branchId;
    }
    return InvoiceModel.find(query)
      .sort({ dueDate: 1 })
      .limit(20)
      .select('invoiceCode customerName outstandingAmount status dueDate tripCode')
      .lean();
  }

  @Get('workspace')
  @Permissions('payments:view', 'invoices:view')
  async workspace(@CurrentUser() user: AuthenticatedUser) {
    await connectToDatabase();
    const scope = !user.permissions.includes('*') && !['executive', 'super_admin', 'finance_officer'].includes(user.role)
      ? { branchId: user.branchId }
      : {};

    const [invoices, payments, collections, trips, fuelLogs, rentalTrips, employees, drivers, customers, customerProfiles] = await Promise.all([
      InvoiceModel.find(scope).sort({ dueDate: 1 }).limit(240).lean(),
      PaymentModel.find(scope).sort({ paymentDate: -1 }).limit(240).lean(),
      CollectionTaskModel.find(scope).sort({ dueDate: 1 }).limit(160).lean(),
      TripModel.find(scope).sort({ createdAt: -1 }).limit(320).lean(),
      FuelLogModel.find(scope).sort({ date: -1 }).limit(320).lean(),
      RentalPartnerTripModel.find().sort({ assignedAt: -1 }).limit(160).lean(),
      EmployeeModel.find().limit(200).lean(),
      DriverModel.find().limit(200).lean(),
      CustomerModel.find().select('_id customerCode companyName').limit(240).lean(),
      CustomerProfileModel.find().select('customerId companyName contactPerson phone').limit(240).lean(),
    ]);

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const paymentsToday = payments.filter((payment: any) => sameDay(payment.paymentDate, now));
    const revenueMtd = payments
      .filter((payment: any) => new Date(String(payment.paymentDate || 0)).getTime() >= monthStart.getTime() && String(payment.status) === 'paid')
      .reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
    const outstandingRows = invoices.filter((invoice: any) => Number(invoice.outstandingAmount || 0) > 0);
    const overdueRows = outstandingRows.filter((invoice: any) => invoice.dueDate && new Date(String(invoice.dueDate)).getTime() < now.getTime());

    const profitabilityByRoute = new Map<string, { revenue: number; invoiceCount: number; fuelCost: number; rentalCost: number }>();
    for (const trip of trips as any[]) {
      const routeKey = trip.routeName || 'Unknown route';
      const current = profitabilityByRoute.get(routeKey) || { revenue: 0, invoiceCount: 0, fuelCost: 0, rentalCost: 0 };
      current.revenue += Number(trip.revenueAmount || 0);
      current.invoiceCount += 1;
      profitabilityByRoute.set(routeKey, current);
    }
    for (const log of fuelLogs as any[]) {
      const trip = trips.find((item: any) => String(item._id) === String(log.tripId));
      const routeKey = trip?.routeName || 'Unknown route';
      const current = profitabilityByRoute.get(routeKey) || { revenue: 0, invoiceCount: 0, fuelCost: 0, rentalCost: 0 };
      current.fuelCost += Number(log.cost || 0);
      profitabilityByRoute.set(routeKey, current);
    }
    for (const rentalTrip of rentalTrips as any[]) {
      const trip = trips.find((item: any) => String(item._id) === String(rentalTrip.tripId));
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
        headcount: employees.filter((employee: any) => String(employee.department) === 'Operations').length || 6,
        payoutDue: (employees.filter((employee: any) => String(employee.department) === 'Operations').length || 6) * 18500,
        commissionDue: drivers.length * 1200,
      },
      {
        role: 'Drivers and dispatch',
        headcount: drivers.length,
        payoutDue: drivers.length * 16500,
        commissionDue: trips.filter((trip: any) => String(trip.status) === 'completed').length * 950,
      },
      {
        role: 'Commercial and finance',
        headcount: employees.filter((employee: any) => ['Marketing', 'Finance'].includes(String(employee.department))).length || 5,
        payoutDue: (employees.filter((employee: any) => ['Marketing', 'Finance'].includes(String(employee.department))).length || 5) * 17250,
        commissionDue: paymentsToday.length * 400,
      },
    ];

    const customerMap = new Map(
      (customers as any[]).flatMap((customer) => {
        const entries: Array<[string, any]> = [];
        if (customer._id) entries.push([String(customer._id), customer]);
        if (customer.customerCode) entries.push([String(customer.customerCode), customer]);
        if (customer.companyName) entries.push([String(customer.companyName), customer]);
        return entries;
      }),
    );
    const customerProfileMap = new Map(
      (customerProfiles as any[]).flatMap((profile) => {
        const entries: Array<[string, any]> = [];
        if (profile.customerId) entries.push([String(profile.customerId), profile]);
        if (profile.companyName) entries.push([String(profile.companyName), profile]);
        return entries;
      }),
    );

    const prioritizedPayments = [
      ...(payments.filter((payment: any) => String(payment.status) === 'paid').slice(0, 16)),
      ...(payments.filter((payment: any) => String(payment.status) !== 'paid').slice(0, 16)),
    ];
    const recentPayments = prioritizedPayments
      .filter((payment, index, rows) => rows.findIndex((candidate: any) => String(candidate._id) === String(payment._id)) === index)
      .slice(0, 24);

    return {
      kpis: {
        revenueMtd,
        outstandingInvoices: outstandingRows.reduce((sum: number, invoice: any) => sum + Number(invoice.outstandingAmount || 0), 0),
        overdueInvoices: overdueRows.length,
        paymentsToday: paymentsToday.length,
        collectionsRequiringFollowUp: collections.filter((task: any) => ['open', 'escalated'].includes(String(task.status))).length,
        payoutsDue: salaryRows.reduce((sum, row) => sum + row.payoutDue + row.commissionDue, 0),
      },
      outstandingInvoices: outstandingRows.map((invoice: any) => ({
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
      recentPayments: recentPayments.map((payment: any) => ({
        id: String(payment._id),
        paymentCode: payment.paymentCode || 'Payment',
        customerCode: payment.customerCode || 'Customer',
        amount: Number(payment.amount || 0),
        status: payment.status || 'paid',
        routeName: payment.routeName || 'Route pending',
        paymentDate: payment.paymentDate || null,
      })),
      collectionsQueue: collections.map((task: any) => ({
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
}

function resolveCustomerContact(invoice: any, customerMap: Map<string, any>, customerProfileMap: Map<string, any>) {
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

function sameDay(value: unknown, now: Date) {
  if (!value) return false;
  const date = new Date(String(value));
  return date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate();
}
