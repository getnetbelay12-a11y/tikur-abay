'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAdminSocket, joinAdminRooms, leaveAdminRooms, subscribeAdminSocketState, type RealtimeConnectionState } from '../lib/realtime';

export type LiveTrackingEvent = {
  shipmentId: string;
  containerNo: string;
  eventType: string;
  location: string;
  timestamp: string;
};

export type LiveShipmentUpdate = {
  shipmentId: string;
  shipmentNo: string;
  status: string;
  stage: string;
  location: string;
  updatedAt: string;
};

export type LiveFinanceUpdate = {
  shipmentId: string;
  financeStatus: string;
  pendingAmount: number;
  receiptIssued: boolean;
};

type UseLiveTrackingResult = {
  connectionState: RealtimeConnectionState;
  trackingEvents: LiveTrackingEvent[];
  latestShipmentUpdate: LiveShipmentUpdate | null;
  latestFinanceUpdate: LiveFinanceUpdate | null;
  latestAlert: { shipmentId?: string; containerNo?: string; message?: string; severity?: string } | null;
};

export function useLiveTracking(shipmentId?: string, containerNo?: string): UseLiveTrackingResult {
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('offline');
  const [trackingEvents, setTrackingEvents] = useState<LiveTrackingEvent[]>([]);
  const [latestShipmentUpdate, setLatestShipmentUpdate] = useState<LiveShipmentUpdate | null>(null);
  const [latestFinanceUpdate, setLatestFinanceUpdate] = useState<LiveFinanceUpdate | null>(null);
  const [latestAlert, setLatestAlert] = useState<UseLiveTrackingResult['latestAlert']>(null);

  const rooms = useMemo(() => {
    const nextRooms = ['tracking'];
    if (shipmentId) {
      nextRooms.push(`shipment:${shipmentId}`);
    }
    if (containerNo) {
      nextRooms.push(`container:${containerNo}`);
    }
    return nextRooms;
  }, [containerNo, shipmentId]);

  useEffect(() => {
    const stop = subscribeAdminSocketState((next) => {
      setConnectionState(next);
    });
    const socket = getAdminSocket();
    if (!socket) {
      return stop;
    }

    joinAdminRooms(rooms);

    const onTrackingEvent = (payload: LiveTrackingEvent) => {
      if (containerNo && payload.containerNo && payload.containerNo !== containerNo) {
        return;
      }
      if (shipmentId && payload.shipmentId && payload.shipmentId !== shipmentId) {
        return;
      }
      setTrackingEvents((current) => [payload, ...current].slice(0, 20));
    };

    const onShipmentUpdated = (payload: LiveShipmentUpdate) => {
      if (shipmentId && payload.shipmentId !== shipmentId) {
        return;
      }
      setLatestShipmentUpdate(payload);
    };

    const onFinanceUpdated = (payload: LiveFinanceUpdate) => {
      if (shipmentId && payload.shipmentId && payload.shipmentId !== shipmentId) {
        return;
      }
      setLatestFinanceUpdate(payload);
    };

    const onAlert = (payload: { shipmentId?: string; containerNo?: string; message?: string; severity?: string }) => {
      if (shipmentId && payload.shipmentId && payload.shipmentId !== shipmentId) {
        return;
      }
      if (containerNo && payload.containerNo && payload.containerNo !== containerNo) {
        return;
      }
      setLatestAlert(payload);
    };

    socket.on('tracking:event', onTrackingEvent);
    socket.on('shipment:updated', onShipmentUpdated);
    socket.on('finance:updated', onFinanceUpdated);
    socket.on('alert:new', onAlert);

    return () => {
      leaveAdminRooms(rooms);
      socket.off('tracking:event', onTrackingEvent);
      socket.off('shipment:updated', onShipmentUpdated);
      socket.off('finance:updated', onFinanceUpdated);
      socket.off('alert:new', onAlert);
      stop();
    };
  }, [containerNo, rooms, shipmentId]);

  return {
    connectionState,
    trackingEvents,
    latestShipmentUpdate,
    latestFinanceUpdate,
    latestAlert,
  };
}
