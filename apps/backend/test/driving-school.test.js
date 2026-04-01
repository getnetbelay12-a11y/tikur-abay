const test = require('node:test');
const assert = require('node:assert/strict');

test('driving school controller exposes dashboard workspace', async () => {
  const { DrivingSchoolController } = require('../dist/modules/driving-school/driving-school.controller.js');

  const fakeService = {
    dashboard: async () => ({
      kpis: { totalStudents: 54, documentsPending: 7, trainingInProgress: 18, examPending: 9, dlProcessing: 4, unpaidBalances: 11 },
      students: [{ studentCode: 'DS-00001', fullName: 'Selam Tesfaye', status: 'training_in_progress' }],
      registrationQueue: [{ studentCode: 'DS-00002', fullName: 'Hana Kebede', status: 'documents_pending' }],
      trainingProgress: [{ studentCode: 'DS-00003', fullName: 'Dawit Tadesse', status: 'training_in_progress' }],
      exams: [{ studentCode: 'DS-00004', fullName: 'Meron Asfaw', status: 'exam_pending' }],
      dlFollowUp: [{ studentCode: 'DS-00005', fullName: 'Biruk Alemu', status: 'dl_processing' }],
      payments: {
        recentPayments: [{ paymentCode: 'DSP-00001', studentCode: 'DS-00001', amount: 2500, status: 'paid' }],
        dueSoon: [{ studentCode: 'DS-00002', fullName: 'Hana Kebede', balance: 8500, status: 'documents_pending' }],
      },
      documents: [{ studentCode: 'DS-00001', fullName: 'Selam Tesfaye', documentCount: 3, documentsPending: false }],
    }),
  };

  const controller = new DrivingSchoolController(fakeService);
  const result = await controller.dashboard();

  assert.equal(result.kpis.totalStudents, 54);
  assert.equal(result.registrationQueue[0].studentCode, 'DS-00002');
  assert.equal(result.payments.recentPayments[0].paymentCode, 'DSP-00001');
});
