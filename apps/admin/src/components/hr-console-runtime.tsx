'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { formatDateTime, formatPerson, formatPhone, formatText } from '../lib/formatters';
import { toArray, toNumberValue, toObject, toStringValue } from '../lib/normalize';
import { useConsoleI18n } from '../lib/use-console-i18n';
import { WorkspaceDetailDrawer } from './workspace-detail-drawer';
import { WorkspaceFilterBar } from './workspace-filter-bar';

type EmployeeSummary = {
  totalEmployeesMeasured: number;
  averageEmployeePerformanceScore: number;
};

type EmployeeRow = {
  employeeId: string;
  employeeCode?: string;
  name: string;
  role: string;
  department: string;
  branchName?: string;
  avgResponseMinutes?: number;
  performanceScore?: number;
  status?: string;
  tripsHandled?: number;
  customersHandled?: number;
  agreementsHandled?: number;
  paymentsHandled?: number;
  issuesResolved?: number;
};

type DriverRow = {
  id: string;
  driverId: string;
  source?: string;
  name: string;
  branch?: string;
  phone?: string;
  emergencyContact?: string;
  licenseNumber?: string;
  licenseExpiry?: string | null;
  faydaStatus?: string;
  status?: string;
  vehicle?: string;
  currentTrip?: string;
  route?: string;
  destination?: string;
  eta?: string | null;
  availability?: string;
  performanceScore?: number | null;
  delayedTrips?: number;
  accidentCount?: number;
};

type TaskRow = {
  taskCode?: string;
  title?: string;
  status?: string;
  dueAt?: string | null;
  assignedTo?: string;
  employeeId?: string;
  candidateId?: string;
};

type TrainingRow = {
  trainingTitle?: string;
  provider?: string;
  completedAt?: string | null;
  expiryDate?: string | null;
  status?: string;
  employeeId?: string;
  driverId?: string;
};

type RequisitionRow = {
  requisitionCode?: string;
  department?: string;
  role?: string;
  status?: string;
  openings?: number;
  requestedBy?: string;
  targetHireDate?: string | null;
};

type CandidateRow = {
  candidateCode?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  branchId?: string;
  appliedRole?: string;
  stage?: string;
  status?: string;
  score?: number;
};

type HrWorkspace = {
  employeeSummary: EmployeeSummary | null;
  employeeRows: EmployeeRow[];
  drivers: DriverRow[];
  onboardingTasks: TaskRow[];
  trainingRecords: TrainingRow[];
  requisitions: RequisitionRow[];
  candidates: CandidateRow[];
};

const emptyWorkspace: HrWorkspace = {
  employeeSummary: null,
  employeeRows: [],
  drivers: [],
  onboardingTasks: [],
  trainingRecords: [],
  requisitions: [],
  candidates: [],
};

type DrawerState =
  | { kind: 'employee'; id: string }
  | { kind: 'driver'; id: string }
  | { kind: 'task'; id: string }
  | { kind: 'training'; id: string }
  | { kind: 'candidate'; id: string }
  | { kind: 'requisition'; id: string }
  | null;

export function HrConsoleRuntime({ workspace }: { workspace: HrWorkspace | null }) {
  const { tx } = useConsoleI18n();
  const safeWorkspace = toObject(workspace, emptyWorkspace);
  const employeeRows = useMemo(() => toArray<EmployeeRow>(safeWorkspace.employeeRows).map(normalizeEmployeeRow), [safeWorkspace.employeeRows]);
  const driverRows = useMemo(() => toArray<DriverRow>(safeWorkspace.drivers).map(normalizeDriverRow), [safeWorkspace.drivers]);
  const onboardingTasks = useMemo(() => toArray<TaskRow>(safeWorkspace.onboardingTasks).map(normalizeTaskRow), [safeWorkspace.onboardingTasks]);
  const trainingRecords = useMemo(() => toArray<TrainingRow>(safeWorkspace.trainingRecords).map(normalizeTrainingRow), [safeWorkspace.trainingRecords]);
  const requisitions = useMemo(() => toArray<RequisitionRow>(safeWorkspace.requisitions).map(normalizeRequisitionRow), [safeWorkspace.requisitions]);
  const candidates = useMemo(() => toArray<CandidateRow>(safeWorkspace.candidates).map(normalizeCandidateRow), [safeWorkspace.candidates]);

  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [focusFilter, setFocusFilter] = useState('all');
  const [drawerState, setDrawerState] = useState<DrawerState>(null);

  const branchOptions = uniqueOptions([
    ...employeeRows.map((row) => row.branchName),
    ...driverRows.map((row) => row.branch),
  ]);
  const departmentOptions = uniqueOptions([
    ...employeeRows.map((row) => row.department),
    ...requisitions.map((row) => row.department),
  ]);

  const filteredEmployees = employeeRows.filter((row) => {
    if (focusFilter !== 'all' && focusFilter !== 'employees' && focusFilter !== 'reviews') return false;
    if (branchFilter !== 'all' && row.branchName !== branchFilter) return false;
    if (departmentFilter !== 'all' && row.department !== departmentFilter) return false;
    if (!search) return true;
    return `${row.name} ${row.employeeCode} ${row.role} ${row.department} ${row.branchName}`.toLowerCase().includes(search.toLowerCase());
  });

  const filteredDrivers = driverRows.filter((row) => {
    if (focusFilter !== 'all' && focusFilter !== 'drivers' && focusFilter !== 'reviews') return false;
    if (branchFilter !== 'all' && row.branch !== branchFilter) return false;
    if (!search) return true;
    return `${row.name} ${row.driverId} ${row.phone} ${row.vehicle} ${row.currentTrip} ${row.branch}`.toLowerCase().includes(search.toLowerCase());
  });

  const filteredTasks = onboardingTasks.filter((row) => {
    if (focusFilter !== 'all' && focusFilter !== 'onboarding') return false;
    if (!search) return true;
    return `${row.taskCode} ${row.title} ${row.assignedTo} ${row.employeeId} ${row.candidateId}`.toLowerCase().includes(search.toLowerCase());
  });

  const filteredTraining = trainingRecords.filter((row) => {
    if (focusFilter !== 'all' && focusFilter !== 'training') return false;
    if (!search) return true;
    return `${row.trainingTitle} ${row.provider} ${row.owner} ${row.status}`.toLowerCase().includes(search.toLowerCase());
  });

  const reviewRows = useMemo(() => {
    const employeeReviews = filteredEmployees.slice(0, 6).map((row) => ({
      id: `employee-${row.employeeId}`,
      person: row.name,
      code: row.employeeCode,
      role: row.role,
      branch: row.branchName,
      score: row.performanceScore,
      status: row.status,
      type: 'Employee review',
      notes: `${row.tripsHandled} trips · ${row.issuesResolved} issues resolved`,
    }));
    const driverReviews = filteredDrivers
      .filter((row) => (row.performanceScore ?? 0) > 0)
      .slice(0, 6)
      .map((row) => ({
        id: `driver-${row.id}`,
        person: row.name,
        code: row.driverId,
        role: 'Driver',
        branch: row.branch,
        score: row.performanceScore,
        status: row.status,
        type: 'Driver review',
        notes: `${row.delayedTrips} delayed trips · ${row.accidentCount} incidents`,
      }));
    return [...employeeReviews, ...driverReviews];
  }, [filteredEmployees, filteredDrivers]);

  const employeeCount = employeeRows.length || toNumberValue(safeWorkspace.employeeSummary?.totalEmployeesMeasured);
  const driverCount = driverRows.length;
  const reviewCount = reviewRows.length;
  const pendingOnboarding = onboardingTasks.filter((row) => ['pending', 'in_progress'].includes(row.status)).length;
  const trainingDue = trainingRecords.filter((row) => row.status !== 'completed' || isExpiringSoon(row.expiryDate)).length;
  const licenseExpiring = driverRows.filter((row) => isExpiringSoon(row.licenseExpiry)).length;

  const selectedEmployee = drawerState?.kind === 'employee' ? employeeRows.find((row) => row.employeeId === drawerState.id) ?? null : null;
  const selectedDriver = drawerState?.kind === 'driver' ? driverRows.find((row) => row.id === drawerState.id) ?? null : null;
  const selectedTask = drawerState?.kind === 'task' ? onboardingTasks.find((row) => row.taskCode === drawerState.id) ?? null : null;
  const selectedTraining = drawerState?.kind === 'training' ? trainingRecords.find((row) => row.id === drawerState.id) ?? null : null;
  const selectedCandidate = drawerState?.kind === 'candidate' ? candidates.find((row) => row.candidateCode === drawerState.id) ?? null : null;
  const selectedRequisition = drawerState?.kind === 'requisition' ? requisitions.find((row) => row.requisitionCode === drawerState.id) ?? null : null;

  return (
    <main className="shell">
      <div className="panel workspace-shell">
        <section className="workspace-header">
          <div className="workspace-header-copy">
            <div className="eyebrow">{tx('People Operations')}</div>
            <h1>{tx('HR Console')}</h1>
            <p>Employee records, driver compliance, onboarding follow-up, training expiry, and performance review actions.</p>
          </div>
        </section>

        <section className="workspace-kpi-grid">
          <KpiCard label={tx('Employees')} value={employeeCount} helper={tx('Master records, contracts, and training coverage')} />
          <KpiCard label={tx('Drivers')} value={driverCount} helper={tx('License, Fayda, and emergency contact visibility')} tone="good" />
          <KpiCard label={tx('Performance Reviews')} value={reviewCount} helper={tx('Employee and driver scorecards in this view')} />
          <KpiCard label={tx('Pending Onboarding')} value={pendingOnboarding} helper={tx('Tasks still needing HR follow-up')} tone="warning" />
          <KpiCard label={tx('Training Due')} value={trainingDue} helper={tx('Expiry or incomplete training records')} tone="warning" />
          <KpiCard label={tx('License Expiring')} value={licenseExpiring} helper={tx('Drivers needing renewal planning')} tone="critical" />
        </section>

        <WorkspaceFilterBar
          fields={[
            { key: 'search', label: 'Search', type: 'search', value: search, placeholder: 'Name, code, role, phone, training, task', onChange: setSearch },
            { key: 'branch', label: 'Branch', type: 'select', value: branchFilter, onChange: setBranchFilter, options: [{ value: 'all', label: 'All branches' }, ...branchOptions] },
            { key: 'department', label: 'Department', type: 'select', value: departmentFilter, onChange: setDepartmentFilter, options: [{ value: 'all', label: 'All departments' }, ...departmentOptions] },
            {
              key: 'focus',
              label: 'Focus',
              type: 'select',
              value: focusFilter,
              onChange: setFocusFilter,
              options: [
                { value: 'all', label: 'All workstreams' },
                { value: 'employees', label: 'Employees' },
                { value: 'drivers', label: 'Drivers' },
                { value: 'reviews', label: 'Performance reviews' },
                { value: 'onboarding', label: 'Onboarding' },
                { value: 'training', label: 'Training and expiry' },
              ],
            },
          ]}
        />

        <section className="card workspace-table-card">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">Employees</div>
              <h3>Master records, contracts, training, and emergency contacts</h3>
            </div>
            <div className="label">{filteredEmployees.length} records</div>
          </div>
          <div className="table-shell">
            <table className="data-table workspace-data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Branch</th>
                  <th>Score</th>
                  <th>Response</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length ? filteredEmployees.map((row) => (
                  <tr key={row.employeeId} onClick={() => setDrawerState({ kind: 'employee', id: row.employeeId })} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="workspace-cell-stack">
                        <strong>{row.name}</strong>
                        <span>{row.employeeCode}</span>
                      </div>
                    </td>
                    <td>{row.role}</td>
                    <td>{row.department}</td>
                    <td>{row.branchName}</td>
                    <td>{formatScore(row.performanceScore)}</td>
                    <td>{row.avgResponseMinutes} min</td>
                    <td><StatusBadge value={row.status} /></td>
                    <td><span className="inline-action">Open detail</span></td>
                  </tr>
                )) : <EmptyTableRow colSpan={8} message="No employee records match the current filters." />}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card workspace-table-card">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">Drivers</div>
              <h3>License expiry, performance reviews, and discipline history</h3>
            </div>
            <div className="label">{filteredDrivers.length} drivers</div>
          </div>
          <div className="table-shell">
            <table className="data-table workspace-data-table">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Phone</th>
                  <th>Emergency</th>
                  <th>DL</th>
                  <th>Current trip</th>
                  <th>Availability</th>
                  <th>Score</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.length ? filteredDrivers.map((row) => (
                  <tr key={row.id} onClick={() => setDrawerState({ kind: 'driver', id: row.id })} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="workspace-cell-stack">
                        <strong>{row.name}</strong>
                        <span>{row.branch}</span>
                      </div>
                    </td>
                    <td>{row.phone}</td>
                    <td>{row.emergencyContact}</td>
                    <td>
                      <div className="workspace-cell-stack">
                        <strong>{row.licenseNumber}</strong>
                        <span>{formatDateTime(row.licenseExpiry, 'Expiry not recorded')}</span>
                      </div>
                    </td>
                    <td>
                      <div className="workspace-cell-stack">
                        <strong>{row.currentTrip}</strong>
                        <span>{row.destination}</span>
                      </div>
                    </td>
                    <td><StatusBadge value={row.availability} /></td>
                    <td>{formatScore(row.performanceScore)}</td>
                    <td><span className="inline-action">Open detail</span></td>
                  </tr>
                )) : <EmptyTableRow colSpan={8} message="No driver records match the current filters." />}
              </tbody>
            </table>
          </div>
        </section>

        <section className="workspace-split-grid">
          <section className="card workspace-table-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">Performance Reviews</div>
                <h3>Latest employee and driver scorecards</h3>
              </div>
              <div className="label">{reviewRows.length} reviews</div>
            </div>
            <div className="workspace-detail-list">
              {reviewRows.length ? reviewRows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="workspace-launch-row"
                  onClick={() => setDrawerState(row.id.startsWith('employee-') ? { kind: 'employee', id: row.id.replace('employee-', '') } : { kind: 'driver', id: row.id.replace('driver-', '') })}
                >
                  <div className="workspace-cell-stack">
                    <strong>{row.person}</strong>
                    <span>{row.type} · {row.role} · {row.branch}</span>
                  </div>
                  <div className="workspace-cell-stack" style={{ textAlign: 'right' }}>
                    <strong>{formatScore(row.score)}</strong>
                    <span>{row.notes}</span>
                  </div>
                </button>
              )) : <div className="empty-state inline-state-card"><p>No performance reviews are available for the current filters.</p></div>}
            </div>
          </section>

          <section className="card workspace-table-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">Onboarding Queue</div>
                <h3>HR follow-up tasks</h3>
              </div>
              <div className="label">{filteredTasks.length} tasks</div>
            </div>
            <div className="workspace-detail-list">
              {filteredTasks.length ? filteredTasks.slice(0, 8).map((row) => (
                <button key={row.taskCode} type="button" className="workspace-launch-row" onClick={() => setDrawerState({ kind: 'task', id: row.taskCode })}>
                  <div className="workspace-cell-stack">
                    <strong>{row.title}</strong>
                    <span>{row.taskCode} · {row.assignedTo}</span>
                  </div>
                  <div className="workspace-cell-stack" style={{ textAlign: 'right' }}>
                    <StatusBadge value={row.status} />
                    <span>{formatDateTime(row.dueAt, 'Due time not scheduled')}</span>
                  </div>
                </button>
              )) : <div className="empty-state inline-state-card"><p>No onboarding tasks match the current filters.</p></div>}
            </div>
          </section>
        </section>

        <section className="workspace-split-grid">
          <section className="card workspace-table-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">Training and Expiry</div>
                <h3>Mandatory courses, expiry dates, and provider history</h3>
              </div>
              <div className="label">{filteredTraining.length} records</div>
            </div>
            <div className="table-shell">
              <table className="data-table workspace-data-table">
                <thead>
                  <tr>
                    <th>Training</th>
                    <th>Owner</th>
                    <th>Provider</th>
                    <th>Completed</th>
                    <th>Expiry</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTraining.length ? filteredTraining.slice(0, 10).map((row) => (
                    <tr key={row.id} onClick={() => setDrawerState({ kind: 'training', id: row.id })} style={{ cursor: 'pointer' }}>
                      <td>{row.trainingTitle}</td>
                      <td>{row.owner}</td>
                      <td>{row.provider}</td>
                      <td>{formatDateTime(row.completedAt, 'Not completed')}</td>
                      <td>{formatDateTime(row.expiryDate, 'No expiry')}</td>
                      <td><StatusBadge value={row.status} /></td>
                      <td><span className="inline-action">Open detail</span></td>
                    </tr>
                  )) : <EmptyTableRow colSpan={7} message="No training records match the current filters." />}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card workspace-table-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">Hiring Pipeline</div>
                <h3>Open requisitions and active candidates</h3>
              </div>
              <div className="label">{requisitions.length + candidates.length} records</div>
            </div>
            <div className="workspace-detail-list">
              {requisitions.slice(0, 4).map((row) => (
                <button key={row.requisitionCode} type="button" className="workspace-launch-row" onClick={() => setDrawerState({ kind: 'requisition', id: row.requisitionCode })}>
                  <div className="workspace-cell-stack">
                    <strong>{row.role}</strong>
                    <span>{row.requisitionCode} · {row.department}</span>
                  </div>
                  <div className="workspace-cell-stack" style={{ textAlign: 'right' }}>
                    <StatusBadge value={row.status} />
                    <span>{row.openings} openings · hire by {formatDateTime(row.targetHireDate, 'Hire date not scheduled')}</span>
                  </div>
                </button>
              ))}
              {candidates.slice(0, 4).map((row) => (
                <button key={row.candidateCode} type="button" className="workspace-launch-row" onClick={() => setDrawerState({ kind: 'candidate', id: row.candidateCode })}>
                  <div className="workspace-cell-stack">
                    <strong>{row.name}</strong>
                    <span>{row.candidateCode} · {row.appliedRole}</span>
                  </div>
                  <div className="workspace-cell-stack" style={{ textAlign: 'right' }}>
                    <StatusBadge value={row.stage} />
                    <span>{row.phone} · score {row.score}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </section>
      </div>

      {selectedEmployee ? (
        <WorkspaceDetailDrawer
          title={selectedEmployee.name}
          subtitle={`${selectedEmployee.employeeCode} · ${selectedEmployee.role} · ${selectedEmployee.branchName}`}
          onClose={() => setDrawerState(null)}
        >
          <section className="workspace-metric-pair-grid">
            <MetricPair label="Department" value={selectedEmployee.department} />
            <MetricPair label="Performance score" value={formatScore(selectedEmployee.performanceScore)} />
            <MetricPair label="Trips handled" value={String(selectedEmployee.tripsHandled)} />
            <MetricPair label="Response time" value={`${selectedEmployee.avgResponseMinutes} min`} />
            <MetricPair label="Customers served" value={String(selectedEmployee.customersHandled)} />
            <MetricPair label="Payments handled" value={String(selectedEmployee.paymentsHandled)} />
          </section>
          <DrawerSection title="Employee summary" emptyMessage="No employee detail is available.">
            <DrawerRow title="Current status" subtitle={labelize(selectedEmployee.status)} meta={`${selectedEmployee.agreementsHandled} agreements · ${selectedEmployee.issuesResolved} issues resolved`} />
            <DrawerRow title="Commercial coverage" subtitle={`${selectedEmployee.customersHandled} customers`} meta={`${selectedEmployee.paymentsHandled} payments supported`} />
            <DrawerRow title="HR records" subtitle="Contract and emergency contact tracking" meta="Use onboarding and training sections for follow-up details" />
          </DrawerSection>
        </WorkspaceDetailDrawer>
      ) : null}

      {selectedDriver ? (
        <WorkspaceDetailDrawer
          title={selectedDriver.name}
          subtitle={`${selectedDriver.driverId} · ${selectedDriver.branch} · ${labelize(selectedDriver.source)}`}
          onClose={() => setDrawerState(null)}
        >
          <section className="workspace-metric-pair-grid">
            <MetricPair label="Phone" value={selectedDriver.phone} />
            <MetricPair label="Emergency contact" value={selectedDriver.emergencyContact} />
            <MetricPair label="DL number" value={selectedDriver.licenseNumber} />
            <MetricPair label="DL expiry" value={formatDateTime(selectedDriver.licenseExpiry, 'Expiry date not recorded')} />
            <MetricPair label="Current trip" value={selectedDriver.currentTrip} />
            <MetricPair label="Destination" value={selectedDriver.destination} />
            <MetricPair label="Fayda" value={labelize(selectedDriver.faydaStatus)} />
            <MetricPair label="Performance score" value={formatScore(selectedDriver.performanceScore)} />
          </section>
          <DrawerSection title="Driver compliance" emptyMessage="No driver compliance detail is available.">
            <DrawerRow title="Availability" subtitle={labelize(selectedDriver.availability)} meta={`${selectedDriver.vehicle} · ETA ${formatDateTime(selectedDriver.eta, 'Not scheduled')}`} />
            <DrawerRow title="Trip context" subtitle={`${selectedDriver.route} · ${selectedDriver.destination}`} meta={`${selectedDriver.delayedTrips} delayed trips · ${selectedDriver.accidentCount} incidents`} />
            <DrawerRow title="Discipline follow-up" subtitle={labelize(selectedDriver.status)} meta="Use driver reports and HR review workflow for formal action" />
          </DrawerSection>
        </WorkspaceDetailDrawer>
      ) : null}

      {selectedTask ? (
        <WorkspaceDetailDrawer
          title={selectedTask.title}
          subtitle={`${selectedTask.taskCode} · ${labelize(selectedTask.status)}`}
          onClose={() => setDrawerState(null)}
        >
          <section className="workspace-metric-pair-grid">
            <MetricPair label="Assigned to" value={selectedTask.assignedTo} />
            <MetricPair label="Due at" value={formatDateTime(selectedTask.dueAt, 'Due time not scheduled')} />
            <MetricPair label="Employee ID" value={selectedTask.employeeId} />
            <MetricPair label="Candidate ID" value={selectedTask.candidateId} />
          </section>
        </WorkspaceDetailDrawer>
      ) : null}

      {selectedTraining ? (
        <WorkspaceDetailDrawer
          title={selectedTraining.trainingTitle}
          subtitle={`${selectedTraining.owner} · ${selectedTraining.provider}`}
          onClose={() => setDrawerState(null)}
        >
          <section className="workspace-metric-pair-grid">
            <MetricPair label="Owner" value={selectedTraining.owner} />
            <MetricPair label="Provider" value={selectedTraining.provider} />
            <MetricPair label="Completed" value={formatDateTime(selectedTraining.completedAt, 'Not completed')} />
            <MetricPair label="Expiry" value={formatDateTime(selectedTraining.expiryDate, 'No expiry')} />
            <MetricPair label="Status" value={labelize(selectedTraining.status)} />
            <MetricPair label="Record ID" value={selectedTraining.id} />
          </section>
        </WorkspaceDetailDrawer>
      ) : null}

      {selectedCandidate ? (
        <WorkspaceDetailDrawer
          title={selectedCandidate.name}
          subtitle={`${selectedCandidate.candidateCode} · ${selectedCandidate.appliedRole}`}
          onClose={() => setDrawerState(null)}
        >
          <section className="workspace-metric-pair-grid">
            <MetricPair label="Phone" value={selectedCandidate.phone} />
            <MetricPair label="Stage" value={labelize(selectedCandidate.stage)} />
            <MetricPair label="Status" value={labelize(selectedCandidate.status)} />
            <MetricPair label="Score" value={String(selectedCandidate.score)} />
          </section>
        </WorkspaceDetailDrawer>
      ) : null}

      {selectedRequisition ? (
        <WorkspaceDetailDrawer
          title={selectedRequisition.role}
          subtitle={`${selectedRequisition.requisitionCode} · ${selectedRequisition.department}`}
          onClose={() => setDrawerState(null)}
        >
          <section className="workspace-metric-pair-grid">
            <MetricPair label="Status" value={labelize(selectedRequisition.status)} />
            <MetricPair label="Requested by" value={selectedRequisition.requestedBy} />
            <MetricPair label="Openings" value={String(selectedRequisition.openings)} />
            <MetricPair label="Target hire date" value={formatDateTime(selectedRequisition.targetHireDate, 'Date pending')} />
          </section>
        </WorkspaceDetailDrawer>
      ) : null}
    </main>
  );
}

function normalizeEmployeeRow(row: EmployeeRow) {
  return {
    employeeId: toStringValue(row.employeeId, toStringValue(row.employeeCode, 'employee')),
    employeeCode: formatText(row.employeeCode, 'Employee record'),
    name: formatPerson(row.name, 'Team member'),
    role: formatText(row.role, 'Role pending'),
    department: formatText(row.department, 'Department pending'),
    branchName: formatText(row.branchName, 'Unknown branch'),
    avgResponseMinutes: toNumberValue(row.avgResponseMinutes),
    performanceScore: toNumberValue(row.performanceScore),
    status: formatText(row.status, 'active'),
    tripsHandled: toNumberValue(row.tripsHandled),
    customersHandled: toNumberValue(row.customersHandled),
    agreementsHandled: toNumberValue(row.agreementsHandled),
    paymentsHandled: toNumberValue(row.paymentsHandled),
    issuesResolved: toNumberValue(row.issuesResolved),
  };
}

function normalizeDriverRow(row: DriverRow) {
  return {
    id: toStringValue(row.id, toStringValue(row.driverId, 'driver')),
    driverId: formatText(row.driverId, 'Driver record'),
    source: formatText(row.source, 'internal'),
    name: formatPerson(row.name, 'Driver'),
    branch: formatText(row.branch, 'Unknown branch'),
    phone: formatPhone(row.phone),
    emergencyContact: formatPhone(row.emergencyContact, 'Emergency contact pending'),
    licenseNumber: formatText(row.licenseNumber, 'DL pending'),
    licenseExpiry: row.licenseExpiry || null,
    faydaStatus: formatText(row.faydaStatus, 'draft'),
    status: formatText(row.status, 'active'),
    vehicle: formatText(row.vehicle, 'Unassigned'),
    currentTrip: formatText(row.currentTrip, 'No active trip'),
    route: formatText(row.route, 'Route pending'),
    destination: formatText(row.destination, 'Destination pending'),
    eta: row.eta || null,
    availability: formatText(row.availability, 'available'),
    performanceScore: row.performanceScore == null ? null : toNumberValue(row.performanceScore),
    delayedTrips: toNumberValue(row.delayedTrips),
    accidentCount: toNumberValue(row.accidentCount),
  };
}

function normalizeTaskRow(row: TaskRow) {
  return {
    taskCode: formatText(row.taskCode, 'Task record'),
    title: formatText(row.title, 'Onboarding task'),
    status: formatText(row.status, 'pending'),
    dueAt: row.dueAt || null,
    assignedTo: formatPerson(row.assignedTo, 'HR desk'),
    employeeId: formatText(row.employeeId, 'Employee pending'),
    candidateId: formatText(row.candidateId, 'Candidate pending'),
  };
}

function normalizeTrainingRow(row: TrainingRow) {
  return {
    id: formatText(`${toStringValue(row.employeeId)}-${toStringValue(row.driverId)}-${toStringValue(row.trainingTitle)}`, 'training-record'),
    trainingTitle: formatText(row.trainingTitle, 'Training record'),
    provider: formatText(row.provider, 'Provider pending'),
    completedAt: row.completedAt || null,
    expiryDate: row.expiryDate || null,
    status: formatText(row.status, 'scheduled'),
    owner: formatText(row.driverId || row.employeeId, 'Assigned record'),
  };
}

function normalizeRequisitionRow(row: RequisitionRow) {
  return {
    requisitionCode: formatText(row.requisitionCode, 'REQ'),
    department: formatText(row.department, 'Department pending'),
    role: formatText(row.role, 'Role pending'),
    status: formatText(row.status, 'open'),
    openings: toNumberValue(row.openings, 1),
    requestedBy: formatPerson(row.requestedBy, 'HR desk'),
    targetHireDate: row.targetHireDate || null,
  };
}

function normalizeCandidateRow(row: CandidateRow) {
  return {
    candidateCode: formatText(row.candidateCode, 'CAN'),
    name: formatPerson(`${toStringValue(row.firstName)} ${toStringValue(row.lastName)}`.trim(), 'Candidate'),
    phone: formatPhone(row.phone),
    appliedRole: formatText(row.appliedRole, 'Role pending'),
    stage: formatText(row.stage, 'screening'),
    status: formatText(row.status, 'active'),
    score: toNumberValue(row.score),
  };
}

function KpiCard({ label, value, helper, tone = 'info' }: { label: string; value: number; helper: string; tone?: 'info' | 'good' | 'warning' | 'critical' }) {
  return (
    <section className="card workspace-kpi-card">
      <div className="eyebrow">{label}</div>
      <div className={`kpi-value ${tone}`}>{formatNumber(value)}</div>
      <div className="label">{helper}</div>
    </section>
  );
}

function MetricPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="workspace-metric-pair">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DrawerSection({ title, emptyMessage, children }: { title: string; emptyMessage: string; children: ReactNode[] | ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <section className="workspace-detail-card">
      <div className="workspace-section-header">
        <div>
          <div className="eyebrow">Detail</div>
          <h3>{title}</h3>
        </div>
      </div>
      <div className="workspace-detail-list">
        {items.length && items.some(Boolean) ? items : <div className="empty-state inline-state-card"><p>{emptyMessage}</p></div>}
      </div>
    </section>
  );
}

function DrawerRow({ title, subtitle, meta }: { title: string; subtitle: string; meta: string }) {
  return (
    <div className="workspace-detail-row">
      <div className="workspace-cell-stack">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      <div className="label">{meta}</div>
    </div>
  );
}

function EmptyTableRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <div className="empty-state inline-state-card"><p>{message}</p></div>
      </td>
    </tr>
  );
}

function StatusBadge({ value }: { value: string }) {
  return <span className={`status-badge ${toneForStatus(value)}`}>{labelize(value)}</span>;
}

function formatScore(value: number | null | undefined) {
  return value == null ? 'Not scored' : value.toFixed(1);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort().map((value) => ({ value, label: value }));
}

function toneForStatus(value: string) {
  if (['blocked', 'expired', 'overdue', 'critical', 'rejected'].includes(value)) return 'critical';
  if (['pending', 'under_review', 'watch', 'in_progress', 'expiring_soon', 'scheduled'].includes(value)) return 'warning';
  if (['active', 'completed', 'approved', 'available'].includes(value)) return 'good';
  return 'info';
}

function labelize(value: string) {
  return formatText(value, 'Not available').replace(/_/g, ' ');
}

function isExpiringSoon(value: string | null | undefined) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() <= Date.now() + (1000 * 60 * 60 * 24 * 45);
}
