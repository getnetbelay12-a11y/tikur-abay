import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import { connectToDatabase } from '../../database/mongo';
import { AgreementModel, AgreementSignatureModel } from '../../database/models';
import { CurrentUser } from '../auth/current-user.decorator';
import { Permissions } from '../auth/permissions.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

type AgreementView = {
  _id: unknown;
  agreementCode?: string;
  customerCode?: string;
  status?: string;
  secureSignToken?: string;
  sentForSignatureAt?: Date;
  signedPdfUrl?: string;
};

@ApiTags('agreements')
@Controller('agreements')
export class AgreementsController {
  @Get()
  @Permissions('agreements:view', 'agreements:own:view')
  async list(@CurrentUser() user: AuthenticatedUser) {
    await connectToDatabase();
    if (user.role === 'customer') {
      return AgreementModel.find({ customerCode: user.customerCode }).sort({ createdAt: -1 }).lean();
    }
    return AgreementModel.find().sort({ createdAt: -1 }).limit(200).lean();
  }

  @Get('my')
  @Permissions('agreements:view', 'agreements:own:view')
  async my(@CurrentUser() user: AuthenticatedUser) {
    await connectToDatabase();
    return AgreementModel.find({ customerCode: user.customerCode }).sort({ createdAt: -1 }).lean();
  }

  @Post(':id/send-sign-link')
  @Permissions('agreements:view')
  async sendSignLink(@Param('id') id: string) {
    await connectToDatabase();
    const token = randomUUID();
    const updated = await AgreementModel.findByIdAndUpdate(
      id,
      { $set: { status: 'sent_for_signature', secureSignToken: token, sentForSignatureAt: new Date() } },
      { new: true },
    ).lean<AgreementView | null>();
    return updated
      ? {
          agreementId: String(updated._id),
          signLink: `https://tikurabay.local/sign/${token}`,
          status: updated.status,
        }
      : null;
  }

  @Post(':id/sign')
  @Permissions('agreements:view', 'agreements:own:view')
  async sign(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { signerName?: string; signerEmail?: string; signerPhone?: string; deviceInfo?: string; ipAddress?: string },
  ) {
    await connectToDatabase();
    const agreement = await AgreementModel.findByIdAndUpdate(
      id,
      {
        $set: {
          status: 'signed',
          signedPdfUrl: `/agreements/${id}/download`,
        },
      },
      { new: true },
    ).lean<AgreementView | null>();
    if (!agreement) return null;
    const signature = await AgreementSignatureModel.create({
      agreementId: agreement._id,
      signerName: body.signerName || user.name,
      signerEmail: body.signerEmail || user.email,
      signerPhone: body.signerPhone || user.phone,
      signedAt: new Date(),
      ipAddress: body.ipAddress || '127.0.0.1',
      deviceInfo: body.deviceInfo || 'mobile-app',
      signedPdfUrl: `/agreements/${id}/download`,
      auditTrail: ['Agreement reviewed', 'Agreement signed in mobile app'],
    });
    return {
      agreement,
      signature: signature.toObject(),
    };
  }

  @Get(':id/download')
  @Permissions('agreements:view', 'agreements:own:view')
  async download(@Param('id') id: string) {
    await connectToDatabase();
    const agreement = await AgreementModel.findById(id).lean<AgreementView | null>();
    return agreement
      ? {
          agreementId: String(agreement._id),
          agreementCode: agreement.agreementCode,
          downloadUrl: agreement.signedPdfUrl || `/agreements/${id}.pdf`,
          status: agreement.status,
        }
      : null;
  }
}
