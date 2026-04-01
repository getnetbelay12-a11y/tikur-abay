import { HrConsoleRuntime } from '../../components/hr-console-runtime';
import { serverApiGet } from '../../lib/server-api';

type EmployeeSummary = {
  totalEmployeesMeasured: number;
  averageEmployeePerformanceScore: number;
};

type EmployeeList = {
  items: Array<Record<string, unknown>>;
};

export default async function HrPage() {
  const [employeeSummary, employeeList, drivers, onboardingTasks, trainingRecords, requisitions, candidates] = await Promise.all([
    serverApiGet<EmployeeSummary>('/performance/employees/summary').catch(() => null),
    serverApiGet<EmployeeList>('/performance/employees?pageSize=18').catch(() => ({ items: [] })),
    serverApiGet<Array<Record<string, unknown>>>('/drivers').catch(() => []),
    serverApiGet<Array<Record<string, unknown>>>('/hr/onboarding-tasks').catch(() => []),
    serverApiGet<Array<Record<string, unknown>>>('/hr/training-records').catch(() => []),
    serverApiGet<Array<Record<string, unknown>>>('/hr/job-requisitions').catch(() => []),
    serverApiGet<Array<Record<string, unknown>>>('/hr/candidates').catch(() => []),
  ]);

  return (
    <HrConsoleRuntime
      workspace={{
        employeeSummary,
        employeeRows: employeeList.items as Array<any>,
        drivers: drivers as Array<any>,
        onboardingTasks: onboardingTasks as Array<any>,
        trainingRecords: trainingRecords as Array<any>,
        requisitions: requisitions as Array<any>,
        candidates: candidates as Array<any>,
      }}
    />
  );
}
