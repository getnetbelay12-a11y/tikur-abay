import { PortalFrame } from '../../components/portal-frame';
import { SupportCenter } from '../../components/support-center';

export default function SupportPage() {
  return (
    <PortalFrame
      currentPath="/support"
      title="Support"
      subtitle="Shipment-linked support threads across chat, email, Telegram, and SMS."
    >
      <SupportCenter />
    </PortalFrame>
  );
}
