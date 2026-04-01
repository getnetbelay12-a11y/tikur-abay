'use client';

import { io, Socket } from 'socket.io-client';
import { apiBase } from './api';
import { readToken } from './auth-session';

let socket: Socket | null = null;
const joinedRooms = new Map<string, number>();
const stateListeners = new Set<(state: RealtimeConnectionState) => void>();
let connectionState: RealtimeConnectionState = 'offline';
let socketLifecycleBound = false;

export type RealtimeConnectionState = 'live' | 'reconnecting' | 'offline';

function socketBaseUrl() {
  return apiBase.replace(/\/api\/v1$/, '');
}

function emitConnectionState(next: RealtimeConnectionState) {
  connectionState = next;
  stateListeners.forEach((listener) => listener(next));
}

function bindSocketLifecycle(current: Socket) {
  if (socketLifecycleBound) {
    return;
  }
  socketLifecycleBound = true;

  current.on('connect', () => {
    emitConnectionState('live');
    const rooms = Array.from(joinedRooms.keys());
    if (rooms.length) {
      current.emit('rooms:join', { rooms });
    }
  });

  current.on('disconnect', () => {
    emitConnectionState('offline');
  });

  current.io.on('reconnect_attempt', () => {
    emitConnectionState('reconnecting');
  });

  current.io.on('reconnect_error', () => {
    emitConnectionState('reconnecting');
  });

  current.io.on('reconnect_failed', () => {
    emitConnectionState('offline');
  });
}

export function getAdminSocket() {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = readToken();
  if (!token) {
    return null;
  }

  if (socket && socket.connected) {
    return socket;
  }

  socket = io(socketBaseUrl(), {
    transports: ['websocket', 'polling'],
    auth: { token },
    autoConnect: true,
    reconnection: true,
  });
  bindSocketLifecycle(socket);
  emitConnectionState('reconnecting');

  socket.on('connect_error', (error) => {
    console.error('Admin realtime connect error', error);
    emitConnectionState('reconnecting');
  });

  return socket;
}

export function joinAdminRooms(rooms: string[]) {
  const normalizedRooms = rooms.map((room) => room.trim()).filter(Boolean);
  if (!normalizedRooms.length) {
    return;
  }

  normalizedRooms.forEach((room) => {
    joinedRooms.set(room, (joinedRooms.get(room) || 0) + 1);
  });

  const current = getAdminSocket();
  if (current) {
    current.emit('rooms:join', { rooms: normalizedRooms });
  }
}

export function leaveAdminRooms(rooms: string[]) {
  const normalizedRooms = rooms.map((room) => room.trim()).filter(Boolean);
  if (!normalizedRooms.length) {
    return;
  }

  const leaving: string[] = [];
  normalizedRooms.forEach((room) => {
    const nextCount = (joinedRooms.get(room) || 0) - 1;
    if (nextCount <= 0) {
      joinedRooms.delete(room);
      leaving.push(room);
      return;
    }
    joinedRooms.set(room, nextCount);
  });

  if (leaving.length && socket) {
    socket.emit('rooms:leave', { rooms: leaving });
  }
}

export function subscribeAdminSocketState(listener: (state: RealtimeConnectionState) => void) {
  stateListeners.add(listener);
  listener(connectionState);
  return () => {
    stateListeners.delete(listener);
  };
}

export function getAdminSocketState() {
  return connectionState;
}

export function disconnectAdminSocket() {
  socket?.disconnect();
  socket = null;
  socketLifecycleBound = false;
  joinedRooms.clear();
  emitConnectionState('offline');
}
