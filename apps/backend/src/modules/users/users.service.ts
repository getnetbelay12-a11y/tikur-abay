import { Injectable } from '@nestjs/common';
import { connectToDatabase } from '../../database/mongo';
import { UserModel } from '../../database/models';

@Injectable()
export class UsersService {
  async list() {
    await connectToDatabase();
    const users = (await UserModel.find({}).sort({ updatedAt: -1 }).limit(250).lean()) as any[];

    return users.map((user) => ({
      id: String(user._id),
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email,
      phone: user.phone || null,
      role: user.role,
      permissions: user.permissions || [],
      branch: user.branchName || 'Unassigned',
      branchId: user.branchId ? String(user.branchId) : null,
      status: user.status,
      employeeCode: user.employeeCode || null,
      customerCode: user.customerCode || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }
}
