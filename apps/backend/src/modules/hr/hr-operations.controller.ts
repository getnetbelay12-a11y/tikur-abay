import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { connectToDatabase } from '../../database/mongo';
import { CandidateModel, JobRequisitionModel, OnboardingTaskHrModel, TrainingRecordModel } from '../../database/models';

@ApiTags('hr')
@Controller('hr')
export class HrOperationsController {
  @Get('job-requisitions')
  async requisitions() {
    await connectToDatabase();
    return JobRequisitionModel.find().sort({ createdAt: -1 }).limit(100).lean();
  }

  @Post('job-requisitions')
  async createRequisition(@Body() body: Record<string, unknown>) {
    await connectToDatabase();
    const count = await JobRequisitionModel.countDocuments({});
    const doc = await JobRequisitionModel.create({ requisitionCode: `REQ-${String(count + 1).padStart(5, '0')}`, ...body });
    return doc.toObject();
  }

  @Get('candidates')
  async candidates() {
    await connectToDatabase();
    return CandidateModel.find().sort({ createdAt: -1 }).limit(100).lean();
  }

  @Post('candidates')
  async createCandidate(@Body() body: Record<string, unknown>) {
    await connectToDatabase();
    const count = await CandidateModel.countDocuments({});
    const doc = await CandidateModel.create({ candidateCode: `CAN-${String(count + 1).padStart(5, '0')}`, ...body });
    return doc.toObject();
  }

  @Get('training-records')
  async trainingRecords() {
    await connectToDatabase();
    return TrainingRecordModel.find().sort({ completedAt: -1 }).limit(100).lean();
  }

  @Get('onboarding-tasks')
  async onboardingTasks() {
    await connectToDatabase();
    return OnboardingTaskHrModel.find().sort({ dueAt: 1 }).limit(100).lean();
  }
}
