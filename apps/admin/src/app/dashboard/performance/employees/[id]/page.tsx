import { ReleaseHoldNotice } from '../../../../../components/release-hold-notice';

export const dynamic = 'force-dynamic';

export default function EmployeePerformanceDetailPage() {
  return (
    <ReleaseHoldNotice
      title="Employee performance drill-down is on hold"
      summary="Employee scorecards remain available in code if needed later, but the active release is centered on shipment ownership from supplier origin through customer confirmation and empty return."
    />
  );
}
