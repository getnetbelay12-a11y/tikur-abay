import { CustomerWorkspaceRuntime } from '../../components/customer-workspace-runtime';
import { serverApiGet } from '../../lib/server-api';

export const dynamic = 'force-dynamic';

type CustomerPortalPayload = {
  portalTitle: string;
  customerName: string;
  activeShipmentRef: string;
  kpis: Array<{ key: string; label: string; value: string; helper: string }>;
  shipments: Array<{
    shipmentRef: string;
    customerName: string;
    currentStage: string;
    currentStatus: string;
    destinationNode: string;
    taxDutySummary: string;
    releaseReadiness: string;
    emptyReturnSummary: string;
    container: {
      containerNumber: string;
      sealNumber: string;
      currentLocation: string;
      currentEta: string;
      detentionRiskLevel: string;
      demurrageRiskLevel: string;
    };
    milestones: Array<{
      id: string;
      label: string;
      location?: string | null;
      occurredAt?: string | null;
      status: string;
    }>;
    linkedDocuments: Array<{
      id: string;
      title: string;
      documentType: string;
      status: string;
    }>;
    payments: Array<{
      id: string;
      invoiceRef: string;
      amount: number;
      status: string;
      timestamp: string;
    }>;
  }>;
};

const emptyPortal: CustomerPortalPayload = {
  portalTitle: 'Tikur Abay Customer Corridor Portal',
  customerName: 'Customer',
  activeShipmentRef: '',
  kpis: [],
  shipments: [],
};

export default async function CustomerWorkspacePage() {
  const portal = await serverApiGet<CustomerPortalPayload>('/corridor/customer-portal').catch(() => emptyPortal);
  return <CustomerWorkspaceRuntime initialPortal={portal} />;
}
