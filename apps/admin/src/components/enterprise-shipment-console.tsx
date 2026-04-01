'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { getAdminSocket, joinAdminRooms, leaveAdminRooms, subscribeAdminSocketState, type RealtimeConnectionState } from '../lib/realtime';

type ShipmentRow = {
  shipmentId: string;
  shipmentRef: string;
  bookingNumber: string;
  customerName: string;
  currentStage: string;
  workflowState?: string;
  readinessStatus?: string;
  blockedReasons?: string[];
};

export function EnterpriseShipmentConsole() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [accessLog, setAccessLog] = useState<any[]>([]);
  const [readiness, setReadiness] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [chatRoom, setChatRoom] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [containerQuery, setContainerQuery] = useState('');
  const [containerLookup, setContainerLookup] = useState<any>(null);
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('offline');

  async function load() {
    const list = await apiGet<ShipmentRow[]>('/shipments?role=super_admin');
    setShipments(list);
    const bookingQuery = searchParams.get('booking') || '';
    const matchedByBooking = bookingQuery
      ? list.find((item) => String(item.bookingNumber || '').trim().toLowerCase() === bookingQuery.trim().toLowerCase())
      : null;
    const nextShipmentId = selectedShipmentId || matchedByBooking?.shipmentId || list[0]?.shipmentId || '';
    setSelectedShipmentId(nextShipmentId);
    if (!nextShipmentId) return;
    const [shipmentDetail, shipmentLog, shipmentReadiness] = await Promise.all([
      apiGet(`/shipments/${nextShipmentId}?role=super_admin`),
      apiGet(`/shipments/${nextShipmentId}/documents/access-log?role=super_admin`).catch(() => []),
      apiGet(`/shipments/${nextShipmentId}/clearance-readiness?role=super_admin`).catch(() => null),
    ]);
    setDetail(shipmentDetail);
    setAccessLog(Array.isArray(shipmentLog) ? shipmentLog : []);
    setReadiness(shipmentReadiness);
  }

  useEffect(() => {
    void load();
  }, [searchParams, selectedShipmentId]);

  useEffect(() => {
    if (!selectedShipmentId) return;
    void (async () => {
      const [shipmentDetail, shipmentLog, shipmentReadiness, room] = await Promise.all([
        apiGet(`/shipments/${selectedShipmentId}?role=super_admin`),
        apiGet(`/shipments/${selectedShipmentId}/documents/access-log?role=super_admin`).catch(() => []),
        apiGet(`/shipments/${selectedShipmentId}/clearance-readiness?role=super_admin`).catch(() => null),
        apiPost<any>('/chat/rooms/resolve?role=super_admin', { shipmentId: selectedShipmentId, roomType: 'shipment' }).catch(() => null),
      ]);
      setDetail(shipmentDetail);
      setAccessLog(Array.isArray(shipmentLog) ? shipmentLog : []);
      setReadiness(shipmentReadiness);
      setChatRoom(room);
      if (room?.id) {
        const response = await apiGet<any>(`/chat/rooms/${room.id}/messages?limit=40&role=super_admin`).catch(() => ({ items: [] }));
        setChatMessages(Array.isArray(response?.items) ? response.items : []);
      }
    })();
  }, [selectedShipmentId]);

  useEffect(() => {
    const socket = getAdminSocket();
    if (!socket || !chatRoom?.id) return;
    socket.emit('chat:join', { roomId: chatRoom.id, shipmentId: selectedShipmentId });
    const onMessage = (payload: any) => {
      if (payload?.roomId !== chatRoom.id) return;
      setChatMessages((current) => current.some((row) => row.id === payload.id) ? current : [...current, payload]);
    };
    socket.on('chat:message', onMessage);
    return () => {
      socket.emit('chat:leave', { roomId: chatRoom.id, shipmentId: selectedShipmentId });
      socket.off('chat:message', onMessage);
    };
  }, [chatRoom?.id, selectedShipmentId]);

  useEffect(() => {
    const stop = subscribeAdminSocketState((next) => {
      setConnectionState(next);
    });
    const socket = getAdminSocket();
    if (!socket) {
      return stop;
    }

    const rooms = ['shipping', 'finance', ...(selectedShipmentId ? [`shipment:${selectedShipmentId}`] : [])];
    joinAdminRooms(rooms);

    const reloadSelected = (payload?: { shipmentId?: string }) => {
      if (payload?.shipmentId && selectedShipmentId && payload.shipmentId !== selectedShipmentId) {
        return;
      }
      void load();
    };

    socket.on('shipment:updated', reloadSelected);
    socket.on('finance:updated', reloadSelected);
    socket.on('alert:new', reloadSelected);

    return () => {
      leaveAdminRooms(rooms);
      socket.off('shipment:updated', reloadSelected);
      socket.off('finance:updated', reloadSelected);
      socket.off('alert:new', reloadSelected);
      stop();
    };
  }, [selectedShipmentId, searchParams]);

  async function runAction(action: 'pack' | 'finance' | 'zip') {
    if (!selectedShipmentId) return;
    setBusyAction(action);
    setStatusMessage('');
    try {
      if (action === 'pack') {
        await apiPost(`/shipments/${selectedShipmentId}/clearance-pack/generate?role=super_admin`, { includeMergedPdf: true });
        setStatusMessage('Clearance pack generated.');
      } else if (action === 'finance') {
        await apiPost(`/shipments/${selectedShipmentId}/finance-clearance?role=super_admin`, { status: 'approved', paymentStatus: 'paid' });
        setStatusMessage('Finance clearance approved.');
      } else {
        await apiPost(`/shipments/${selectedShipmentId}/documents/bulk-download?role=super_admin`, {});
        setStatusMessage('Bulk ZIP prepared.');
      }
      await load();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Action failed.');
    } finally {
      setBusyAction('');
    }
  }

  async function sendChatMessage() {
    if (!chatRoom?.id || !chatDraft.trim()) return;
    const sent = await apiPost<any>(`/chat/rooms/${chatRoom.id}/messages?role=super_admin`, { content: chatDraft.trim() });
    setChatMessages((current) => [...current, sent]);
    setChatDraft('');
    await apiPost(`/chat/rooms/${chatRoom.id}/read?role=super_admin`, {});
  }

  async function locateContainer() {
    const normalizedQuery = containerQuery.trim();
    if (!normalizedQuery) {
      setContainerLookup(null);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('query');
      params.delete('q');
      const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(nextUrl);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set('query', normalizedQuery);
    params.delete('q');
    router.replace(`${pathname}?${params.toString()}`);
    try {
      const response = await fetch(`/api/tracking?query=${encodeURIComponent(normalizedQuery)}`, { cache: 'no-store' });
      const payload = await response.json();
      setContainerLookup(payload);
      const matchedShipment = shipments.find((item) => {
        const bookingNo = String(payload?.container?.bookingNo || '').trim().toLowerCase();
        return bookingNo && String(item.bookingNumber || '').trim().toLowerCase() === bookingNo;
      });
      if (matchedShipment?.shipmentId) {
        setSelectedShipmentId(matchedShipment.shipmentId);
      }
    } catch (error) {
      console.error('Enterprise container locator failed', error);
      setContainerLookup(null);
    }
  }

  const groups = detail?.documentHub?.groups ?? [];
  const blockedReasons = readiness?.blockingReasons ?? detail?.clearanceBlockedReasons ?? [];

  return (
    <section className="enterprise-console">
      <article className="card enterprise-console-hero">
        <div className="enterprise-console-hero-head">
          <div>
            <div className="label">Enterprise shipment workflow</div>
            <h1>{detail?.bookingNumber || 'Shipment command console'}</h1>
          </div>
          <div className="enterprise-console-hero-badges">
            <span className={`status-badge ${connectionState === 'live' ? 'good' : connectionState === 'reconnecting' ? 'warning' : 'info'}`}>{connectionState === 'live' ? 'Live' : connectionState === 'reconnecting' ? 'Reconnecting' : 'Offline fallback'}</span>
            <span className={`status-badge ${readiness?.ready ? 'good' : 'critical'}`}>{readiness?.ready ? 'Ready' : 'Blocked'}</span>
            <span className="status-badge info">{detail?.clearance?.workflowState || detail?.readiness?.workflowState || 'waiting_for_documents'}</span>
            <span className="status-badge warning">{detail?.currentStage || 'Shipment stage pending'}</span>
          </div>
        </div>
        {blockedReasons.length ? (
          <div className="enterprise-console-blocked">
            <strong>Blocked reason</strong>
            <div className="enterprise-console-blocked-list">
              {blockedReasons.map((item: string) => <span key={item}>{item}</span>)}
            </div>
          </div>
        ) : null}
        {statusMessage ? <p className="enterprise-console-status">{statusMessage}</p> : null}
        <form
          className="enterprise-console-search"
          onSubmit={(event) => {
            event.preventDefault();
            void locateContainer();
          }}
        >
          <input
            className="input"
            value={containerQuery}
            onChange={(event) => {
              const nextValue = event.target.value;
              setContainerQuery(nextValue);
              if (!nextValue.trim()) {
                setContainerLookup(null);
              }
            }}
            placeholder="Enter container number, BL number, or booking number"
            aria-label="Enter container number, BL number, or booking number"
          />
          <button type="submit" className="btn btn-secondary">Find container</button>
        </form>
        {containerLookup?.container ? (
          <>
            <div className="label enterprise-console-section-label">Container lifecycle snapshot</div>
            <div className="enterprise-console-snapshot-grid">
              <DetailRow label="Container" value={containerLookup.container.containerNo} />
              <DetailRow label="Current status" value={containerLookup.container.currentStatus} />
              <DetailRow label="Exact location" value={containerLookup.container.currentLocation} />
              <DetailRow label="Last update" value={containerLookup.container.updatedAt ? new Date(containerLookup.container.updatedAt).toLocaleString() : 'Pending'} />
            </div>
            <div className="enterprise-console-actions">
              <button type="button" className="btn btn-secondary" onClick={() => {
                if (!containerLookup?.container?.containerNo) return;
                window.location.assign(`/operations/empty-return?q=${encodeURIComponent(containerLookup.container.containerNo)}`);
              }}>
                Open empty return
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => {
                if (!containerLookup?.container?.containerNo) return;
                window.location.assign(`/tracking?query=${encodeURIComponent(containerLookup.container.containerNo)}`);
              }}>
                Open tracking
              </button>
            </div>
          </>
        ) : null}
      </article>

      <div className="enterprise-console-grid">
        <article className="card enterprise-console-panel">
          <div className="label">Shipment workflow summary</div>
          <div className="enterprise-console-summary">
            <label className="label" htmlFor="enterprise-shipment-select">Shipment</label>
            <select
              id="enterprise-shipment-select"
              className="input"
              value={selectedShipmentId}
              onChange={(event) => setSelectedShipmentId(event.target.value)}
            >
              {shipments.map((item) => (
                <option key={item.shipmentId} value={item.shipmentId}>{item.bookingNumber} · {item.customerName}</option>
              ))}
            </select>
            <DetailRow label="Customer" value={detail?.customerName} />
            <DetailRow label="Consignee" value={detail?.consigneeName} />
            <DetailRow label="Container" value={detail?.containers?.[0]?.containerNumber} />
            <DetailRow label="Seal" value={detail?.containers?.[0]?.sealNumber} />
            <DetailRow label="Finance" value={detail?.finance?.paymentStatus || detail?.clearance?.chargesPaymentStatus} />
            <DetailRow label="Clearance pack" value={detail?.clearance?.clearancePackUrl ? 'Generated' : 'Pending'} />
            <DetailRow label="Reimbursement" value={`${detail?.finance?.pendingDriverReimbursement?.count || 0} pending`} />
          </div>
        </article>

        <div className="enterprise-console-stack">
          <article className="card enterprise-console-panel">
            <div className="enterprise-console-panel-head">
              <div>
                <div className="label">Document hub</div>
                <h2>Versioned shipment documents</h2>
              </div>
              <span className="status-badge info">{detail?.documentHub?.summary?.total || 0} active docs</span>
            </div>
            <div className="enterprise-console-documents">
              {groups.map((group: any) => (
                <div key={group.tag} className="enterprise-console-doc-group">
                  <div className="enterprise-console-doc-head">
                    <strong>{group.tag.replace(/_/g, ' ')}</strong>
                    <span className={`status-badge ${group.latest?.status === 'locked' || group.latest?.status === 'verified' ? 'good' : group.latest?.status === 'rejected' ? 'critical' : 'warning'}`}>
                      {group.latest?.status || 'missing'}
                    </span>
                  </div>
                  <div className="label enterprise-console-doc-file">{group.latest?.fileName || 'No file'} · v{group.latest?.versionNumber || 0}</div>
                  <div className="enterprise-console-doc-versions">
                    {group.versions.map((version: any) => (
                      <div key={version.shipmentDocumentId} className="enterprise-console-doc-version">
                        <span>{version.fileName}</span>
                        <span>{version.isLatestVersion ? 'active' : 'archived'} · v{version.versionNumber}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="card enterprise-console-panel">
            <div className="label">Clearance readiness</div>
            <h2>{readiness?.ready ? 'GREEN: Ready' : 'RED: Blocked'}</h2>
            <div className="enterprise-console-readiness">
              <DetailRow label="Workflow" value={readiness?.workflowState} />
              <DetailRow label="Missing documents" value={(readiness?.missingItems || []).join(', ') || 'None'} />
              <DetailRow label="Missing fields" value={(readiness?.missingFields || []).join(', ') || 'None'} />
              <DetailRow label="Finance approved" value={readiness?.financeApproved ? 'Yes' : 'No'} />
            </div>
          </article>

          <article className="card enterprise-console-panel">
            <div className="label">Container lifecycle</div>
            <h2>Movement timeline</h2>
            <div className="enterprise-console-timeline">
              {(detail?.milestones || []).slice(-8).map((item: any) => (
                <div key={item.milestoneId} className="enterprise-console-timeline-item">
                  <div className="enterprise-console-timeline-dot" />
                  <div className="enterprise-console-timeline-copy">
                    <strong>{item.label}</strong>
                    <div className="label">{item.location || 'Shipment corridor'} · {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Pending'}</div>
                    {item.note ? <div className="enterprise-console-timeline-note">{item.note}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="enterprise-console-stack">
          <article className="card enterprise-console-panel">
            <div className="label">Actions</div>
            <h2>Release orchestration</h2>
            <div className="enterprise-console-action-list">
              <button type="button" className="btn btn-primary" disabled={busyAction === 'pack'} onClick={() => void runAction('pack')}>Generate clearance pack</button>
              <button type="button" className="btn btn-secondary" disabled={busyAction === 'finance'} onClick={() => void runAction('finance')}>Approve finance clearance</button>
              <button type="button" className="btn btn-secondary" disabled={busyAction === 'zip'} onClick={() => void runAction('zip')}>Bulk ZIP download</button>
            </div>
          </article>

          <article className="card enterprise-console-panel">
            <div className="label">Document access log</div>
            <h2>Traceability</h2>
            <div className="enterprise-console-scroll-list enterprise-console-log-list">
              {accessLog.length ? accessLog.map((row: any) => (
                <div key={row._id} className="enterprise-console-log-row">
                  <strong>{row.action}</strong>
                  <div className="label">{row.fileName || 'bundle'} · {row.role || 'unknown role'}</div>
                  <div className="label">{row.actorName || row.userId || 'system'} · {new Date(row.createdAt).toLocaleString()}</div>
                </div>
              )) : <span className="label">No access log entries yet.</span>}
            </div>
          </article>

          <article className="card enterprise-console-panel">
            <div className="label">Shipment chat</div>
            <h2>Live coordination</h2>
            <div className="enterprise-console-scroll-list enterprise-console-chat-list">
              {chatMessages.length ? chatMessages.map((row: any) => (
                <div key={row.id} className="enterprise-console-log-row">
                  <strong>{row.senderName || 'System'}</strong>
                  <div className="label">{row.senderRole || row.messageType || 'message'} · {row.createdAt ? new Date(row.createdAt).toLocaleString() : 'Pending'}</div>
                  <div className="enterprise-console-chat-content">{row.content || row.text || ''}</div>
                </div>
              )) : <span className="label">No shipment chat yet.</span>}
            </div>
            <div className="enterprise-console-chat-form">
              <textarea className="input" rows={3} value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} placeholder="Write shipment coordination message" />
              <button type="button" className="btn btn-primary" onClick={() => void sendChatMessage()}>Send message</button>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number | undefined | null }) {
  return (
    <div className="enterprise-console-detail-row">
      <span className="label">{label}</span>
      <strong>{value || 'Pending'}</strong>
    </div>
  );
}
