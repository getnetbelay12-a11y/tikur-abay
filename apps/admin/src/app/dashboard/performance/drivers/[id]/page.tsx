import { ReleaseHoldNotice } from '../../../../../components/release-hold-notice';

export const dynamic = 'force-dynamic';

export default function DriverPerformanceDetailPage() {
  return (
    <ReleaseHoldNotice
      title="Driver performance drill-down is on hold"
      summary="Driver scorecards stay in the codebase, but this release keeps the product focused on origin preparation, ocean and Djibouti handling, inland tracking, customer confirmation, and empty return closure."
    />
  );
}
