import { ReleaseHoldNotice } from '../../../../components/release-hold-notice';

export const dynamic = 'force-dynamic';

export default async function DriverPerformancePage() {
  return (
    <ReleaseHoldNotice
      title="Driver Performance Is On Hold"
      summary="Driver scorecards are paused for this release. The active production focus is trip execution, checkpoint updates, customer receipt approval, and empty return back to Djibouti."
    />
  );
}
