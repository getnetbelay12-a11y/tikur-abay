import { ReleaseHoldNotice } from '../../components/release-hold-notice';

export default async function DrivingSchoolPage() {
  return (
    <ReleaseHoldNotice
      title="Driving School Is On Hold"
      summary="The current production scope is the shipment corridor only. Driving school and training workflows are paused until the China-to-Djibouti-to-customer delivery flow is finalized."
    />
  );
}
