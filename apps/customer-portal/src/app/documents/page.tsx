import { DocumentsLibrary } from '../../components/documents-library';
import { PortalFrame } from '../../components/portal-frame';

export default function DocumentsPage() {
  return (
    <PortalFrame
      currentPath="/documents"
      title="Document Vault"
      subtitle="Cross-shipment access to BLs, invoices, packing lists, transit documents, release notes, PODs, and receipts."
    >
      <DocumentsLibrary />
    </PortalFrame>
  );
}
