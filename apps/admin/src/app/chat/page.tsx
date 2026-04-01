import { ChatRuntime } from '../../components/chat-runtime';
import { serverApiGet } from '../../lib/server-api';

type RoomRecord = Record<string, unknown>;
type MessageRecord = Record<string, unknown>;

export default async function ChatPage() {
  const rooms = await serverApiGet<RoomRecord[]>('/chat/rooms').catch(() => []);
  const initialRoomId = String(rooms[0]?.['id'] ?? '');
  const messages = initialRoomId
    ? await serverApiGet<MessageRecord[]>(`/chat/rooms/${initialRoomId}/messages`).catch(() => [])
    : [];

  return (
    <main className="shell">
      <div className="panel">
        <ChatRuntime
          initialRooms={rooms.map((room) => ({
            id: String(room['id'] ?? ''),
            title: String(room['title'] ?? 'Chat room'),
            unreadCount: Number(room['unreadCount'] ?? 0),
            roomType: String(room['roomType'] ?? 'internal'),
            status: String(room['status'] ?? 'active'),
            tripId: room['tripId'] ? String(room['tripId']) : null,
            customerId: room['customerId'] ? String(room['customerId']) : null,
          }))}
          initialMessages={messages.map((message) => ({
            id: String(message['id'] ?? ''),
            roomId: String(message['roomId'] ?? initialRoomId),
            senderName: String(message['senderName'] ?? 'System update'),
            senderUserId: String(message['senderUserId'] ?? ''),
            text: String(message['text'] ?? ''),
            createdAt: String(message['createdAt'] ?? ''),
            ownMessage: Boolean(message['ownMessage']),
          }))}
        />
      </div>
    </main>
  );
}
