'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { getCustomerPortalSocket } from '../lib/realtime';

type ChatRoomRecord = {
  id: string;
  shipmentId?: string;
  title?: string;
};

export function LiveShipmentsWorkspace() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [tracking, setTracking] = useState<any>(null);
  const [chatRoom, setChatRoom] = useState<ChatRoomRecord | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatDraft, setChatDraft] = useState('');

  useEffect(() => {
    void (async () => {
      const list = await apiGet<any[]>('/shipments?role=customer_user').catch(() => []);
      setShipments(list);
      const firstId = list[0]?.shipmentId || '';
      setSelectedShipmentId(firstId);
    })();
  }, []);

  useEffect(() => {
    if (!selectedShipmentId) return;
    void (async () => {
      const [shipmentDetail, shipmentTracking, room] = await Promise.all([
        apiGet(`/shipment/${selectedShipmentId}?role=customer_user`).catch(() => null),
        apiGet(`/shipment/${selectedShipmentId}/tracking?role=customer_user`).catch(() => null),
        apiPost<ChatRoomRecord | null>('/chat/rooms/resolve?role=customer_user', { shipmentId: selectedShipmentId, roomType: 'shipment' }).catch(() => null),
      ]);
      setDetail(shipmentDetail);
      setTracking(shipmentTracking);
      setChatRoom(room);
      if (room?.id) {
        const response = await apiGet<any>(`/chat/rooms/${room.id}/messages?limit=40&role=customer_user`).catch(() => ({ items: [] }));
        setChatMessages(Array.isArray(response?.items) ? response.items : []);
        await apiPost(`/chat/rooms/${room.id}/read?role=customer_user`, {}).catch(() => null);
      }
    })();
  }, [selectedShipmentId]);

  useEffect(() => {
    const socket = getCustomerPortalSocket();
    if (!socket || !chatRoom?.id) return undefined;

    socket.emit('chat:join', { roomId: chatRoom.id, shipmentId: selectedShipmentId });
    const onMessage = (payload: any) => {
      if (payload.roomId !== chatRoom.id) return;
      setChatMessages((current) => (
        current.some((item) => item.id === payload.id) ? current : [...current, payload]
      ));
    };
    socket.on('chat:message', onMessage);

    return () => {
      socket.emit('chat:leave', { roomId: chatRoom.id, shipmentId: selectedShipmentId });
      socket.off('chat:message', onMessage);
    };
  }, [chatRoom?.id, selectedShipmentId]);

  async function sendChatMessage() {
    if (!chatRoom?.id || !chatDraft.trim()) return;
    const sent = await apiPost<any>(`/chat/rooms/${chatRoom.id}/messages?role=customer_user`, { content: chatDraft.trim() }).catch(() => null);
    if (!sent) return;
    setChatMessages((current) => (
      current.some((item) => item.id === sent.id) ? current : [...current, sent]
    ));
    setChatDraft('');
    await apiPost(`/chat/rooms/${chatRoom.id}/read?role=customer_user`, {}).catch(() => null);
  }

  return (
    <section className="portal-grid portal-shipments-layout">
      <article className="portal-card">
        <div className="portal-section-header">
          <div>
            <div className="portal-section-eyebrow">Live shipments</div>
            <h2>Customer live view</h2>
            <p style={{ marginTop: 6, color: 'var(--portal-text-muted, #6b7280)' }}>Shipment list for My Shipments</p>
          </div>
        </div>
        <div className="portal-shipment-list">
          {shipments.map((shipment) => (
            <button key={shipment.shipmentId} type="button" className={shipment.shipmentId === selectedShipmentId ? 'portal-shipment-row active' : 'portal-shipment-row'} onClick={() => setSelectedShipmentId(shipment.shipmentId)}>
              <div className="portal-row-head">
                <strong>{shipment.bookingNumber}</strong>
                <span className={`portal-status-chip ${shipment.readinessStatus === 'ready' ? 'success' : 'warning'}`}>{shipment.currentStage}</span>
              </div>
              <p>{shipment.customerName}</p>
              <div className="portal-row-foot">
                <span>{shipment.workflowState || 'waiting_for_documents'}</span>
                <span>{shipment.readinessStatus || 'blocked'}</span>
              </div>
            </button>
          ))}
        </div>
      </article>

      <div className="portal-grid portal-shipment-detail">
        <article className="portal-card">
          <div className="portal-section-header">
            <div>
              <div className="portal-section-eyebrow">Shipment status</div>
              <h2>{detail?.bookingNumber || 'Select shipment'}</h2>
            </div>
            <span className={`portal-status-chip ${detail?.readiness?.clearanceReady ? 'success' : 'warning'}`}>{detail?.readiness?.workflowState || 'waiting_for_documents'}</span>
          </div>
          <div className="portal-data-grid">
            <div className="portal-data-item"><span>Customer</span><strong>{detail?.customerName || 'Pending'}</strong></div>
            <div className="portal-data-item"><span>Shipment</span><strong>{detail?.shipmentRef || 'Pending'}</strong></div>
            <div className="portal-data-item"><span>Container</span><strong>{detail?.containers?.[0]?.containerNumber || 'Pending'}</strong></div>
            <div className="portal-data-item"><span>Release readiness</span><strong>{detail?.readiness?.clearanceReady ? 'Ready' : 'Blocked'}</strong></div>
            <div className="portal-data-item"><span>Current location</span><strong>{tracking?.currentLocation ? `${tracking.currentLocation.latitude}, ${tracking.currentLocation.longitude}` : 'Awaiting GPS'}</strong></div>
            <div className="portal-data-item"><span>ETA</span><strong>{tracking?.eta?.estimatedArrivalAt ? new Date(tracking.eta.estimatedArrivalAt).toLocaleString() : 'Pending'}</strong></div>
          </div>
          {(detail?.readiness?.blockedReasons || []).length ? (
            <div style={{ marginTop: 14 }} className="portal-doc-row">
              <div>
                <strong>Blocked reasons</strong>
                <p>{detail.readiness.blockedReasons.join(' · ')}</p>
              </div>
              <span className="portal-status-chip warning">Action needed</span>
            </div>
          ) : null}
        </article>

        <section className="portal-grid two">
          <article className="portal-card">
            <div className="portal-section-header"><div><div className="portal-section-eyebrow">Map tracking</div><h2>Live corridor tracking</h2></div></div>
            <div className="portal-list">
              <div className="portal-list-row">
                <div>
                  <strong>Status</strong>
                  <p>{tracking?.status || 'Pending'}</p>
                </div>
                <span className="portal-status-chip info">{tracking?.risk?.status || 'On Track'}</span>
              </div>
              {(tracking?.checkpoints || []).map((item: any) => (
                <div key={item.label} className="portal-list-row">
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.location}</p>
                  </div>
                  <span className="portal-status-chip">{item.status}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="portal-card">
            <div className="portal-section-header"><div><div className="portal-section-eyebrow">Documents</div><h2>Shipment document hub</h2></div></div>
            <div className="portal-doc-list">
              {(detail?.documentHub?.groups || []).map((group: any) => (
                <div key={group.tag} className="portal-doc-row">
                  <div>
                    <strong>{group.tag.replace(/_/g, ' ')} · v{group.latest?.versionNumber || 0}</strong>
                    <p>{group.latest?.fileName || 'Pending'} · {group.latest?.status || 'draft'}</p>
                  </div>
                  <span className="portal-status-chip info">{group.latest?.verificationStatus || 'valid'}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="portal-card">
            <div className="portal-section-header"><div><div className="portal-section-eyebrow">Invoices</div><h2>Finance view</h2></div></div>
            <div className="portal-list">
              {(detail?.finance?.invoices || []).map((row: any) => (
                <div key={row._id} className="portal-list-row">
                  <div>
                    <strong>{row.invoiceCode || row.invoiceNo || 'Invoice'}</strong>
                    <p>{row.status}</p>
                  </div>
                  <span className="portal-status-chip">{row.totalAmount || row.total || 0}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="portal-card">
            <div className="portal-section-header"><div><div className="portal-section-eyebrow">Release</div><h2>Release readiness</h2></div></div>
            <div className="portal-list">
              <div className="portal-list-row"><div><strong>Workflow</strong><p>{detail?.clearance?.workflowState || 'waiting_for_documents'}</p></div><span className="portal-status-chip">{detail?.clearance?.readinessStatus || 'blocked'}</span></div>
              <div className="portal-list-row"><div><strong>Finance clearance</strong><p>{detail?.finance?.paymentStatus || 'pending'}</p></div><span className="portal-status-chip">{detail?.readiness?.clearanceReady ? 'Ready' : 'Blocked'}</span></div>
            </div>
          </article>

          <article className="portal-card">
            <div className="portal-section-header"><div><div className="portal-section-eyebrow">Shipment chat</div><h2>Customer-safe live messages</h2></div></div>
            <div className="portal-list">
              {chatMessages.length ? chatMessages.map((row: any) => (
                <div key={row.id} className="portal-list-row">
                  <div>
                    <strong>{row.senderName || 'System'}</strong>
                    <p>{row.content || row.text || ''}</p>
                  </div>
                  <span className="portal-status-chip info">{row.senderRole || row.messageType || 'message'}</span>
                </div>
              )) : <div className="portal-list-row"><div><strong>No shipment chat yet</strong><p>Support and operations messages will appear here.</p></div><span className="portal-status-chip">No messages</span></div>}
            </div>
            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              <textarea className="portal-select" rows={3} value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} placeholder="Ask support, operations, finance, or clearance about this shipment" />
              <button type="button" className="portal-btn" onClick={() => void sendChatMessage()}>Send message</button>
            </div>
          </article>
        </section>
      </div>
    </section>
  );
}
