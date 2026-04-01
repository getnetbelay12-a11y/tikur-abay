'use client';

import { io, Socket } from 'socket.io-client';
import { apiBase } from './api';

let socket: Socket | null = null;

function socketBaseUrl() {
  return apiBase.replace(/\/api\/v1$/, '');
}

function readToken() {
  if (typeof window === 'undefined') return null;
  return (
    window.localStorage.getItem('tikur-abay:customer-portal:access-token') ||
    window.sessionStorage.getItem('tikur-abay:customer-portal:access-token')
  );
}

export function getCustomerPortalSocket() {
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

  socket.on('connect_error', (error) => {
    console.error('Customer realtime connect error', error);
  });

  return socket;
}

export function disconnectCustomerPortalSocket() {
  socket?.disconnect();
  socket = null;
}
