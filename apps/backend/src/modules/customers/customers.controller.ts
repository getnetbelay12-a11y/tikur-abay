// @ts-nocheck
import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { connectToDatabase } from '../../database/mongo';
import { CustomerModel, InvoiceModel } from '../../database/models';
import { CurrentUser } from '../auth/current-user.decorator';
import { Permissions } from '../auth/permissions.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  @Get()
  @Permissions('customers:view')
  async list(@CurrentUser() user: AuthenticatedUser) {
    await connectToDatabase();
    if (user.permissions.includes('*') || ['executive', 'marketing_officer'].includes(user.role)) {
      return CustomerModel.find().sort({ createdAt: -1 }).limit(100).lean();
    }

    return CustomerModel.find({ branchId: user.branchId }).sort({ createdAt: -1 }).limit(100).lean();
  }

  @Get('top')
  @Permissions('customers:view', 'dashboards:executive:view')
  async top(@CurrentUser() user: AuthenticatedUser) {
    await connectToDatabase();
    const invoiceMatch = !user.permissions.includes('*') && !['executive', 'super_admin', 'marketing_officer'].includes(user.role)
      ? [{ $match: { branchId: user.branchId } }]
      : [];
    return InvoiceModel.aggregate([
      ...invoiceMatch,
      { $match: { customerId: { $ne: null } } },
      {
        $group: {
          _id: '$customerId',
          tripVolume: { $sum: 1 },
          invoiceTotal: { $sum: '$totalAmount' },
          outstandingAmount: { $sum: '$outstandingAmount' },
        },
      },
      { $sort: { invoiceTotal: -1 } },
      { $limit: 12 },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customer',
        },
      },
      { $unwind: '$customer' },
      {
        $project: {
          companyName: '$customer.companyName',
          customerCode: '$customer.customerCode',
          status: '$customer.status',
          tripVolume: 1,
          invoiceTotal: 1,
          outstandingAmount: 1,
        },
      },
    ]);
  }

  @Get(':id')
  @Permissions('customers:view')
  async getOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await connectToDatabase();
    const customer = await CustomerModel.findOne({ $or: [{ _id: id }, { customerCode: id }] }).lean();
    if (!customer) return null;
    if (user.permissions.includes('*') || ['executive', 'marketing_officer'].includes(user.role)) {
      return customer;
    }
    return String(customer.branchId) === user.branchId ? customer : null;
  }
}
