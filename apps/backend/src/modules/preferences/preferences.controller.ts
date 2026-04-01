import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { connectToDatabase } from '../../database/mongo';
import { UserPreferenceModel } from '../../database/models';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('me')
@Controller('me/preferences')
export class PreferencesController {
  @Get()
  async getPreferences(@CurrentUser() user: AuthenticatedUser) {
    await connectToDatabase();
    const preference = await UserPreferenceModel.findOneAndUpdate(
      { userId: user.id },
      { $setOnInsert: { language: 'en', timezone: 'Africa/Addis_Ababa', notificationPreferences: {} } },
      { upsert: true, new: true },
    ).lean();
    return preference;
  }

  @Patch('language')
  async updateLanguage(@CurrentUser() user: AuthenticatedUser, @Body() body: { language?: string }) {
    await connectToDatabase();
    return UserPreferenceModel.findOneAndUpdate(
      { userId: user.id },
      { $set: { language: body.language || 'en' } },
      { upsert: true, new: true },
    ).lean();
  }

  @Patch()
  async updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { language?: string; timezone?: string; notificationPreferences?: Record<string, unknown> },
  ) {
    await connectToDatabase();
    return UserPreferenceModel.findOneAndUpdate(
      { userId: user.id },
      {
        $set: {
          ...(body.language ? { language: body.language } : {}),
          ...(body.timezone ? { timezone: body.timezone } : {}),
          ...(body.notificationPreferences ? { notificationPreferences: body.notificationPreferences } : {}),
        },
      },
      { upsert: true, new: true },
    ).lean();
  }
}
