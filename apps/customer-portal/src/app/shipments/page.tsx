import { PortalFrame } from '../../components/portal-frame';
import { LiveShipmentsWorkspace } from '../../components/live-shipments-workspace';

export default function ShipmentsPage() {
  return (
    <PortalFrame
      currentPath="/shipments"
      title="Shipment Workspace"
      subtitle="Track live shipment status, map movement, documents, invoices, and release readiness in one dense customer view."
    >
      <LiveShipmentsWorkspace />
    </PortalFrame>
  );
}
