import { ManagementRuntime } from '../../components/management-runtime';
import { serverApiGet } from '../../lib/server-api';

type ExecutiveSummary = {
  urgentActions?: Array<Record<string, unknown>>;
  kpis?: Array<Record<string, unknown>>;
  latestPayments?: Array<Record<string, unknown>>;
};

type FleetSummary = Record<string, unknown>;
type FinanceWorkspace = Record<string, unknown>;

async function loadSection<T>(path: string): Promise<T | null> {
  try {
    return await serverApiGet<T>(path);
  } catch {
    return null;
  }
}

export default async function ManagementPage() {
  const [executiveSummary, fleetSummary, financeWorkspace, onboardingTasks, trainingRecords] = await Promise.all([
    loadSection<ExecutiveSummary>('/dashboard/executive-summary'),
    loadSection<FleetSummary>('/operations/fleet-summary'),
    loadSection<FinanceWorkspace>('/finance/workspace'),
    loadSection<Array<Record<string, unknown>>>('/hr/onboarding-tasks'),
    loadSection<Array<Record<string, unknown>>>('/hr/training-records'),
  ]);

  return (
    <ManagementRuntime
      executiveSummary={executiveSummary}
      fleetSummary={fleetSummary}
      financeWorkspace={financeWorkspace}
      onboardingTasks={onboardingTasks ?? []}
      trainingRecords={trainingRecords ?? []}
    />
  );
}
