import { ReleaseHoldNotice } from '../../../../components/release-hold-notice';

export const dynamic = 'force-dynamic';

export default async function EmployeePerformancePage() {
  return (
    <ReleaseHoldNotice
      title="Employee Performance Is On Hold"
      summary="People scorecards are paused for the current release. The platform focus is the end-to-end shipment process from supplier booking in China to customer approval and empty return back to Djibouti."
    />
  );
}
