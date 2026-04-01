import { Injectable } from '@nestjs/common';
import { connectToDatabase } from '../../database/mongo';
import {
  DocumentModel,
  DrivingSchoolPaymentModel,
  DrivingSchoolStudentModel,
} from '../../database/models';

@Injectable()
export class DrivingSchoolService {
  async dashboard() {
    await connectToDatabase();
    const [students, payments, documents] = await Promise.all([
      DrivingSchoolStudentModel.find().sort({ createdAt: -1 }).limit(120).lean(),
      DrivingSchoolPaymentModel.find().sort({ paidAt: -1 }).limit(120).lean(),
      DocumentModel.find({ entityType: 'driving_student' }).sort({ createdAt: -1 }).limit(120).lean(),
    ]);

    const duePayments = students.filter((item) => Number(item.paidAmount ?? 0) < Number(item.totalFee ?? 0));
    const examPending = students.filter((item) => ['exam_pending', 'training_in_progress'].includes(String(item.status)));
    const dlFollowUp = students.filter((item) => ['dl_processing', 'exam_passed'].includes(String(item.status)));
    const recentPayments = payments.slice(0, 8).map((item) => ({
      id: String(item._id),
      paymentCode: item.paymentCode,
      studentCode: item.studentCode,
      amount: Number(item.amount ?? 0),
      status: item.status,
      paidAt: item.paidAt,
      method: item.method,
    }));

    return {
      kpis: {
        totalStudents: students.length,
        documentsPending: students.filter((item) => item.documentsPending).length,
        trainingInProgress: students.filter((item) => String(item.status) === 'training_in_progress').length,
        examPending: examPending.length,
        dlProcessing: students.filter((item) => String(item.status) === 'dl_processing').length,
        unpaidBalances: duePayments.length,
      },
      students: students.map((item) => ({
        id: String(item._id),
        studentCode: item.studentCode,
        fullName: item.fullName,
        phone: item.phone,
        status: item.status,
        progressPercent: Number(item.trainingProgressPercent ?? 0),
        theoryExamStatus: item.theoryExamStatus ?? 'pending',
        roadExamStatus: item.roadExamStatus ?? 'pending',
        dlFollowUpStatus: item.dlFollowUpStatus ?? 'pending',
        totalFee: Number(item.totalFee ?? 0),
        paidAmount: Number(item.paidAmount ?? 0),
        nextLessonAt: item.nextLessonAt,
        examScheduledAt: item.examScheduledAt,
      })),
      registrationQueue: students
        .filter((item) => ['registered', 'documents_pending', 'enrolled'].includes(String(item.status)))
        .slice(0, 10),
      trainingProgress: students
        .filter((item) => ['enrolled', 'training_in_progress', 'exam_pending'].includes(String(item.status)))
        .slice(0, 10),
      exams: examPending.slice(0, 10),
      dlFollowUp: dlFollowUp.slice(0, 10),
      payments: {
        recentPayments,
        dueSoon: duePayments.slice(0, 10).map((item) => ({
          id: String(item._id),
          studentCode: item.studentCode,
          fullName: item.fullName,
          balance: Number(item.totalFee ?? 0) - Number(item.paidAmount ?? 0),
          status: item.status,
        })),
      },
      documents: students.slice(0, 10).map((item) => {
        const studentDocs = documents.filter((doc) => String(doc.entityId) === String(item.studentCode));
        return {
          id: String(item._id),
          studentCode: item.studentCode,
          fullName: item.fullName,
          documentCount: studentDocs.length,
          latestDocumentAt: studentDocs[0]?.createdAt ?? null,
          documentsPending: Boolean(item.documentsPending),
        };
      }),
    };
  }
}
