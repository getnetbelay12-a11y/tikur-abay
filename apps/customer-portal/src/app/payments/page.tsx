import { PaymentsCenter } from '../../components/payments-center';
import { PortalFrame } from '../../components/portal-frame';

export default function CustomerPaymentsPage() {
  return (
    <PortalFrame
      currentPath="/payments"
      title="Payments"
      subtitle="Customer-facing invoice, receipt, and payment readiness across current shipment files."
    >
      <PaymentsCenter />
    </PortalFrame>
  );
}
