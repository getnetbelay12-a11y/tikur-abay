import { Injectable } from '@nestjs/common';
import { connectToDatabase } from '../../database/mongo';
import { ActivityLogModel, LaunchChecklistItemModel } from '../../database/models';
import { AuthenticatedUser } from '../auth/auth.types';

type LaunchTrack = 'go_live' | 'soft_launch' | 'daily_review' | 'weekly_improvement' | 'full_rollout';
type LaunchStatus = 'ready' | 'scheduled' | 'in_progress' | 'watch' | 'blocked';

type LaunchSeed = {
  code: string;
  title: string;
  track: LaunchTrack;
  owner: string;
  audience: string;
  branch: string;
  dueDate: string;
  status: LaunchStatus;
  actionLabel: string;
  summary: string;
  checklist: string[];
  notes?: string;
};

const seedItems: LaunchSeed[] = [
  {
    code: 'go-live-users',
    title: 'Real users and branch roster verified',
    track: 'go_live',
    owner: 'HR and branch admins',
    audience: 'executive, operations, finance',
    branch: 'HQ and Bole',
    dueDate: '2026-03-18',
    status: 'in_progress',
    actionLabel: 'Verify roster',
    summary: 'Confirm live staff accounts, active branches, and assigned roles before production access.',
    checklist: ['Validate real user list per branch.', 'Confirm each branch has dispatcher, finance, and approver coverage.', 'Remove expired demo-only accounts from production candidates.'],
    notes: 'Bole finance and dispatcher roster still needs final sign-off.',
  },
  {
    code: 'go-live-permissions',
    title: 'Role permissions and notification channels',
    track: 'go_live',
    owner: 'Platform admin',
    audience: 'all staff',
    branch: 'All launch branches',
    dueDate: '2026-03-18',
    status: 'ready',
    actionLabel: 'Audit access',
    summary: 'Permission matrix, SMS/email escalation channels, and branch-scoped access must be checked together.',
    checklist: ['Run role-permission audit for executive, operations, finance, HR, customer, and driver roles.', 'Verify urgent operational alerts send to the correct channel.', 'Confirm branch-limited roles cannot open out-of-scope records.'],
    notes: 'Initial audit passed for HQ and Adama.',
  },
  {
    code: 'go-live-payments',
    title: 'Signing flow, payment flow, backups, and monitoring',
    track: 'go_live',
    owner: 'Finance and engineering',
    audience: 'finance, customer desk',
    branch: 'HQ',
    dueDate: '2026-03-19',
    status: 'watch',
    actionLabel: 'Run verification',
    summary: 'Production sign-off requires agreement signing, receipts, backups, monitoring, and error tracking to be verified as one release gate.',
    checklist: ['Run end-to-end agreement signing test.', 'Run payment posting and receipt visibility test.', 'Verify backup schedule and restore runbook.', 'Confirm monitoring and error tracking dashboards are live.'],
    notes: 'Receipt rendering is good. Restore drill still pending.',
  },
  {
    code: 'soft-launch-branches',
    title: 'Limited branch and user cohort',
    track: 'soft_launch',
    owner: 'Operations manager',
    audience: 'operations, dispatcher',
    branch: 'HQ and Adama',
    dueDate: '2026-03-20',
    status: 'scheduled',
    actionLabel: 'Open plan',
    summary: 'Soft launch uses only the first two branches with limited drivers and customer accounts.',
    checklist: ['Enable only HQ and Adama.', 'Limit to named dispatcher and finance users.', 'Limit customer accounts to pilot customers only.'],
    notes: 'Pilot customer list drafted and waiting for finance confirmation.',
  },
  {
    code: 'soft-launch-review',
    title: 'Issue log and daily review cadence',
    track: 'soft_launch',
    owner: 'Program lead',
    audience: 'executive, operations, engineering',
    branch: 'Pilot branches',
    dueDate: '2026-03-20',
    status: 'ready',
    actionLabel: 'Open issue log',
    summary: 'Every pilot day closes with issue review, owner assignment, and next-day readiness confirmation.',
    checklist: ['Capture issue severity and owner daily.', 'Hold 30-minute end-of-day review.', 'Publish next-day release or workaround plan.'],
    notes: 'Daily review invite and issue log template are ready.',
  },
  {
    code: 'daily-delays',
    title: 'Daily delayed trip and blocked vehicle review',
    track: 'daily_review',
    owner: 'Operations control room',
    audience: 'operations, dispatcher',
    branch: 'All active branches',
    dueDate: 'Every day 08:00',
    status: 'ready',
    actionLabel: 'Open operations hub',
    summary: 'Operations starts every day by reviewing delayed trips, blocked vehicles, and overdue maintenance together.',
    checklist: ['Open delayed trips.', 'Open blocked vehicles.', 'Open overdue maintenance.', 'Confirm dispatch follow-up owners.'],
    notes: 'Morning control-room review is part of pilot kickoff.',
  },
  {
    code: 'daily-commercial',
    title: 'Daily failed payments and unsigned agreement review',
    track: 'daily_review',
    owner: 'Finance and commercial desk',
    audience: 'finance, marketing, customer desk',
    branch: 'HQ',
    dueDate: 'Every day 09:00',
    status: 'ready',
    actionLabel: 'Open finance console',
    summary: 'Finance and commercial teams review failed payments, unsigned agreements, and complaints before midday.',
    checklist: ['Check failed payments.', 'Check outstanding invoices.', 'Check unsigned agreements.', 'Escalate customer complaints.'],
    notes: 'Collections queue is the primary commercial handoff.',
  },
  {
    code: 'daily-compliance',
    title: 'Daily KYC, failed uploads, and support complaints',
    track: 'daily_review',
    owner: 'HR and support desk',
    audience: 'HR, support',
    branch: 'All active branches',
    dueDate: 'Every day 11:00',
    status: 'watch',
    actionLabel: 'Open HR console',
    summary: 'Compliance-sensitive issues must be checked daily during the pilot period.',
    checklist: ['Review KYC queue.', 'Review failed uploads.', 'Review user complaints and reopen blocked cases.'],
    notes: 'Driver KYC backlog needs one more reviewer during launch week.',
  },
  {
    code: 'weekly-triage',
    title: 'Weekly issue triage and fix priority',
    track: 'weekly_improvement',
    owner: 'Product and engineering',
    audience: 'executive, operations, engineering',
    branch: 'HQ',
    dueDate: 'Every Friday',
    status: 'scheduled',
    actionLabel: 'Open workflow',
    summary: 'Each week closes with issue triage, priority assignment, and release scope lock.',
    checklist: ['Sort issues by severity and user impact.', 'Mark pilot blockers for immediate release.', 'Defer non-blockers with owner and target week.'],
    notes: 'Friday release cutoff is 15:00 Addis time.',
  },
  {
    code: 'weekly-release',
    title: 'Release notes and admin feedback capture',
    track: 'weekly_improvement',
    owner: 'Program lead',
    audience: 'all pilot admins',
    branch: 'Pilot branches',
    dueDate: 'Every Friday',
    status: 'in_progress',
    actionLabel: 'Export feedback',
    summary: 'Feedback from operations, finance, and HR is converted into release notes and tracked improvements.',
    checklist: ['Export the feedback template.', 'Collect admin notes from each pilot role.', 'Publish release notes for next week.'],
    notes: 'Release note template is ready; admin feedback export runs locally.',
  },
  {
    code: 'rollout-branches',
    title: 'All branches enabled and staff trained',
    track: 'full_rollout',
    owner: 'Executive sponsor',
    audience: 'all staff',
    branch: 'Nationwide',
    dueDate: '2026-04-03',
    status: 'blocked',
    actionLabel: 'Review blocker',
    summary: 'Full rollout stays blocked until branch enablement, staff training, and permissions are complete.',
    checklist: ['Confirm branch cutover schedule.', 'Confirm all staff training attendance.', 'Confirm all branch role assignments.'],
    notes: 'Nazret training session has not been completed yet.',
  },
  {
    code: 'rollout-drivers',
    title: 'All drivers and customer accounts ready',
    track: 'full_rollout',
    owner: 'Operations and customer success',
    audience: 'drivers, customers',
    branch: 'Nationwide',
    dueDate: '2026-04-03',
    status: 'watch',
    actionLabel: 'Open readiness',
    summary: 'Before nationwide enablement, drivers must be onboarded and customer accounts must be validated.',
    checklist: ['Approve final driver onboarding queue.', 'Verify customer account contacts and agreements.', 'Recheck final permissions for driver and customer self-service flows.'],
    notes: 'Driver onboarding is ahead of customer agreement validation.',
  },
];

@Injectable()
export class LaunchService {
  async list() {
    await connectToDatabase();
    await this.ensureSeed();
    const rows = await LaunchChecklistItemModel.find().sort({ track: 1, dueDate: 1, updatedAt: -1 }).lean();
    const history = await ActivityLogModel.find({ entityType: 'launch_checklist_item' }).sort({ createdAt: -1 }).limit(30).lean();
    return { items: rows.map((row) => this.serialize(row)), history: history.map((row) => this.serializeHistory(row)) };
  }

  async update(code: string, user: AuthenticatedUser, body: { status?: LaunchStatus; notes?: string }) {
    await connectToDatabase();
    await this.ensureSeed();
    const update: Record<string, unknown> = {};
    if (body.status) update.status = body.status;
    if (typeof body.notes === 'string') update.notes = body.notes;
    update.lastUpdatedBy = user.name || `${user.firstName} ${user.lastName}`.trim();
    update.lastUpdatedByRole = user.role;
    const row = (await LaunchChecklistItemModel.findOneAndUpdate({ code }, { $set: update }, { new: true }).lean()) as any;
    if (row) {
      await ActivityLogModel.create({
        entityType: 'launch_checklist_item',
        entityId: String(row._id),
        action: body.status ? 'launch_status_updated' : 'launch_notes_updated',
        title: row.title,
        description: body.status
          ? `${update.lastUpdatedBy} changed launch status to ${body.status}`
          : `${update.lastUpdatedBy} updated launch notes`,
        userId: user.id,
        userName: update.lastUpdatedBy,
        metadata: {
          code,
          track: row.track,
          status: row.status,
        },
      });
    }
    return this.serialize(row);
  }

  private async ensureSeed() {
    const existing = await LaunchChecklistItemModel.find({}, { code: 1 }).lean();
    const existingCodes = new Set(existing.map((item) => String(item.code)));
    const missing = seedItems.filter((item) => !existingCodes.has(item.code));
    if (missing.length) {
      await LaunchChecklistItemModel.insertMany(missing);
    }
  }

  private serialize(row: any) {
    return {
      id: String(row?._id || row?.code || ''),
      code: String(row?.code || ''),
      title: String(row?.title || 'Launch item'),
      track: String(row?.track || 'go_live'),
      owner: String(row?.owner || 'Launch owner'),
      audience: String(row?.audience || 'all staff'),
      branch: String(row?.branch || 'HQ'),
      dueDate: String(row?.dueDate || 'TBD'),
      status: String(row?.status || 'scheduled'),
      actionLabel: String(row?.actionLabel || 'Open'),
      summary: String(row?.summary || 'Launch detail not set.'),
      checklist: Array.isArray(row?.checklist) ? row.checklist.map((item: unknown) => String(item)) : [],
      notes: String(row?.notes || ''),
      lastUpdatedBy: String(row?.lastUpdatedBy || 'Launch owner'),
      lastUpdatedByRole: String(row?.lastUpdatedByRole || ''),
      updatedAt: row?.updatedAt ? new Date(row.updatedAt).toISOString() : null,
    };
  }

  private serializeHistory(row: any) {
    return {
      id: String(row?._id || ''),
      title: String(row?.title || 'Launch update'),
      description: String(row?.description || ''),
      userName: String(row?.userName || 'System'),
      action: String(row?.action || 'updated'),
      createdAt: row?.createdAt ? new Date(row.createdAt).toISOString() : null,
    };
  }
}
