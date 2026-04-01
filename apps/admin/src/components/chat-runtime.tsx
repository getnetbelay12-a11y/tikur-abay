'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { formatDateTime, formatText } from '../lib/formatters';
import { getAdminSocket } from '../lib/realtime';
import { WorkspaceFilterBar } from './workspace-filter-bar';

type RoomRecord = {
  id: string;
  title: string;
  unreadCount?: number;
  roomType?: string;
  status?: string;
  tripId?: string | null;
  customerId?: string | null;
};

type MessageRecord = {
  id: string;
  roomId: string;
  senderName: string;
  senderUserId: string;
  senderRole?: string;
  text?: string;
  content?: string;
  messageType?: string;
  attachments?: Array<{ fileName?: string; fileUrl?: string }>;
  createdAt: string;
  ownMessage?: boolean;
};

type MessageEnvelope = {
  room?: RoomRecord | null;
  items?: MessageRecord[];
  nextCursor?: string | null;
};

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All rooms' },
  { value: 'internal', label: 'Internal' },
  { value: 'trip', label: 'Trip-linked' },
  { value: 'customer', label: 'Customer-linked' },
  { value: 'attention', label: 'Unread only' },
];

export function ChatRuntime({
  initialRooms,
  initialMessages,
}: {
  initialRooms: RoomRecord[];
  initialMessages: MessageRecord[];
}) {
  const [rooms, setRooms] = useState<RoomRecord[]>(initialRooms);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(initialRooms[0]?.id || '');
  const [messages, setMessages] = useState<MessageRecord[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const filteredRooms = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rooms.filter((room) => {
      const roomCategory = deriveCategory(room);
      if (category === 'attention' && Number(room.unreadCount ?? 0) <= 0) return false;
      if (!['all', 'attention'].includes(category) && roomCategory !== category) return false;
      if (!query) return true;
      return [
        formatText(room.title, 'Chat room'),
        roomCategory,
        formatText(room.status, 'active'),
        formatText(room.tripId, ''),
        formatText(room.customerId, ''),
      ].join(' ').toLowerCase().includes(query);
    });
  }, [category, rooms, search]);

  const selectedRoom = useMemo(
    () => filteredRooms.find((room) => room.id === selectedRoomId)
      ?? rooms.find((room) => room.id === selectedRoomId)
      ?? filteredRooms[0]
      ?? rooms[0]
      ?? null,
    [filteredRooms, rooms, selectedRoomId],
  );

  const roomMessages = useMemo(
    () => messages.filter((message) => message.roomId === selectedRoom?.id),
    [messages, selectedRoom?.id],
  );

  useEffect(() => {
    if (!selectedRoomId && filteredRooms[0]?.id) {
      setSelectedRoomId(filteredRooms[0].id);
    }
  }, [filteredRooms, selectedRoomId]);

  async function loadMessages(roomId: string) {
    try {
      const result = await apiGet<MessageEnvelope>(`/chat/rooms/${roomId}/messages`);
      setMessages((current) => {
        const others = current.filter((item) => item.roomId !== roomId);
        return [...others, ...(Array.isArray(result?.items) ? result.items : [])];
      });
      await apiPost(`/chat/rooms/${roomId}/read`, {});
    } catch (loadError) {
      console.error('Chat message load failed', loadError);
      setError('Unable to load chat messages right now.');
    }
  }

  useEffect(() => {
    if (!selectedRoom?.id) return;
    void loadMessages(selectedRoom.id);
  }, [selectedRoom?.id]);

  useEffect(() => {
    const socket = getAdminSocket();
    if (!socket || !selectedRoom?.id) return undefined;

    socket.emit('chat:join', { roomId: selectedRoom.id });
    const onMessage = (payload: MessageRecord) => {
      if (payload.roomId !== selectedRoom.id) return;
      setMessages((current) => {
        if (current.some((item) => item.id === payload.id)) {
          return current;
        }
        return [...current, payload];
      });
      setRooms((current) => current.map((room) => (
        room.id === selectedRoom.id
          ? { ...room, unreadCount: payload.ownMessage ? room.unreadCount ?? 0 : Math.max(0, Number(room.unreadCount ?? 0) + 1) }
          : room
      )));
    };
    const onRead = (payload: { roomId?: string; userId?: string }) => {
      if (payload.roomId !== selectedRoom.id) return;
      setRooms((current) => current.map((room) => (
        room.id === selectedRoom.id ? { ...room, unreadCount: 0 } : room
      )));
    };
    socket.on('chat:message', onMessage);
    socket.on('chat:read', onRead);

    return () => {
      socket.emit('chat:leave', { roomId: selectedRoom.id });
      socket.off('chat:message', onMessage);
      socket.off('chat:read', onRead);
    };
  }, [selectedRoom?.id]);

  async function sendMessage() {
    if (!selectedRoom?.id || !draft.trim()) {
      setError('Message cannot be empty.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const sent = await apiPost<MessageRecord>(`/chat/rooms/${selectedRoom.id}/messages`, { content: draft.trim() });
      setMessages((current) => [...current, sent]);
      setDraft('');
      setRooms((current) => current.map((room) => (
        room.id === selectedRoom.id ? { ...room, unreadCount: 0 } : room
      )));
      await apiPost(`/chat/rooms/${selectedRoom.id}/read`, {});
    } catch (sendError) {
      console.error('Chat send failed', sendError);
      setError('Unable to send the message right now.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="workspace-shell">
      <section className="workspace-header">
        <div className="workspace-header-copy">
          <div className="eyebrow">Chat Workspace</div>
          <h1>Chat</h1>
          <p>Coordinate dispatch, maintenance, finance, and customer follow-up with shared context and real-time room activity.</p>
        </div>
      </section>

      <WorkspaceFilterBar
        fields={[
          { key: 'search', label: 'Search', type: 'search', value: search, placeholder: 'Room, trip, customer, status', onChange: setSearch },
          { key: 'category', label: 'Category', type: 'select', value: category, onChange: setCategory, options: CATEGORY_OPTIONS },
        ]}
      />

      <section className="chat-workspace-grid">
        <section className="card workspace-table-card chat-room-panel">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">Rooms</div>
              <h3>{filteredRooms.length} active rooms</h3>
            </div>
          </div>
          {!filteredRooms.length ? (
            <div className="empty-state inline-state-card"><p>No chat rooms match the current filters.</p></div>
          ) : (
            <div className="chat-room-list">
              {filteredRooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  className={`chat-room-card ${room.id === selectedRoom?.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedRoomId(room.id);
                    setRooms((current) => current.map((item) => (
                      item.id === room.id ? { ...item, unreadCount: 0 } : item
                    )));
                  }}
                >
                  <div className="chat-room-card-top">
                    <strong>{formatText(room.title, 'Chat room')}</strong>
                    <span className={`status-badge ${toneForRoom(room)}`}>{room.unreadCount ? `${room.unreadCount} unread` : humanize(formatText(room.status, 'active'))}</span>
                  </div>
                  <div className="chat-room-card-meta">
                    <span>{humanize(deriveCategory(room))}</span>
                    <span>{contextLabel(room)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="card workspace-table-card chat-thread-panel">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">Conversation</div>
              <h3>{formatText(selectedRoom?.title, 'Messages')}</h3>
            </div>
          </div>
          <div className="chat-thread">
            {!roomMessages.length ? (
              <div className="empty-state inline-state-card"><p>No messages yet in this room.</p></div>
            ) : (
              roomMessages.map((message) => (
                <div key={message.id} className={`chat-message ${message.ownMessage ? 'own' : ''}`}>
                  <div className="chat-message-meta">
                    <strong>{formatText(message.senderName, 'System update')}</strong>
                    <span>{formatDateTime(message.createdAt)}</span>
                  </div>
                  <p>{formatText(message.content || message.text, 'Message not recorded')}</p>
                  {Array.isArray(message.attachments) && message.attachments.length ? (
                    <div className="label" style={{ marginTop: 8 }}>
                      {message.attachments.map((attachment) => attachment.fileName || 'Attachment').join(' · ')}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
          {error ? <div className="label" style={{ color: 'var(--danger)', marginTop: 12 }}>{error}</div> : null}
          <div className="chat-composer">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write a message"
            />
            <button className="btn btn-primary" type="button" onClick={() => void sendMessage()} disabled={sending}>
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </section>

        <section className="card workspace-table-card chat-context-panel">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">Context</div>
              <h3>Linked operational context</h3>
            </div>
          </div>
          <div className="workspace-detail-list">
            <div className="workspace-detail-row">
              <div className="workspace-cell-stack">
                <strong>Room type</strong>
                <span>{humanize(deriveCategory(selectedRoom))}</span>
              </div>
              <span className={`status-badge ${toneForRoom(selectedRoom)}`}>{humanize(formatText(selectedRoom?.status, 'active'))}</span>
            </div>
            <div className="workspace-detail-row">
              <div className="workspace-cell-stack">
                <strong>Trip context</strong>
                <span>{selectedRoom?.tripId ? `Trip record ${selectedRoom.tripId}` : 'No linked trip on this room'}</span>
              </div>
              {selectedRoom?.tripId ? <Link href="/trips" className="inline-action">Open trips</Link> : <span className="label">No trip link</span>}
            </div>
            <div className="workspace-detail-row">
              <div className="workspace-cell-stack">
                <strong>Customer context</strong>
                <span>{selectedRoom?.customerId ? `Customer record ${selectedRoom.customerId}` : 'No linked customer on this room'}</span>
              </div>
              {selectedRoom?.customerId ? <Link href="/customers" className="inline-action">Open customers</Link> : <span className="label">No customer link</span>}
            </div>
            <div className="workspace-detail-row">
              <div className="workspace-cell-stack">
                <strong>Unread count</strong>
                <span>{Number(selectedRoom?.unreadCount ?? 0) > 0 ? 'Unread follow-up pending' : 'Room already reviewed'}</span>
              </div>
              <span className="label">{Number(selectedRoom?.unreadCount ?? 0)} unread</span>
            </div>
            <div className="workspace-detail-row">
              <div className="workspace-cell-stack">
                <strong>Conversation activity</strong>
                <span>{roomMessages.length ? `${roomMessages.length} messages loaded` : 'No conversation activity yet'}</span>
              </div>
              <span className="label">{roomMessages.length ? formatDateTime(roomMessages[roomMessages.length - 1]?.createdAt) : 'No activity time'}</span>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}

function deriveCategory(room?: RoomRecord | null) {
  if (!room) return 'internal';
  if (room.tripId) return 'trip';
  if (room.customerId) return 'customer';
  return formatText(room.roomType, 'internal');
}

function contextLabel(room?: RoomRecord | null) {
  if (!room) return 'No linked context';
  if (room.tripId) return `Trip ${room.tripId}`;
  if (room.customerId) return `Customer ${room.customerId}`;
  return humanize(formatText(room.status, 'active'));
}

function toneForRoom(room?: RoomRecord | null) {
  if (!room) return 'info';
  if (Number(room.unreadCount ?? 0) > 0) return 'warning';
  if (formatText(room.status, 'active') === 'active') return 'good';
  return 'info';
}

function humanize(value: string) {
  return formatText(value, 'Not available').replace(/_/g, ' ');
}
