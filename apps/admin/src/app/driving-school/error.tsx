'use client';

import { ReleaseHoldNotice } from '../../components/release-hold-notice';

export default function DrivingSchoolError({
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReleaseHoldNotice
      title="Driving school is on hold"
      summary="Driving school remains out of the main release scope while Tikur Abay is focused on supplier origin, vessel movement, Djibouti release, inland delivery, customer confirmation, and empty return closure."
    />
  );
}
