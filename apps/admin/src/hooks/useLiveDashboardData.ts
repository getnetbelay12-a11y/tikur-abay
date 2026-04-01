'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '../lib/api';
import { getAdminSocket, getAdminSocketState, joinAdminRooms, leaveAdminRooms, subscribeAdminSocketState, type RealtimeConnectionState } from '../lib/realtime';

export type DashboardAlert = {
  id: string;
  issue: string;
  severity?: string;
  type?: string;
};

export type DashboardData = {
  kpis: {
    total: number;
    active: number;
    delayed: number;
    clearance: number;
    transit: number;
    release: number;
    returns: number;
    onTime: number;
  };
  status: Array<{ name: string; value: number }>;
  trend: Array<{ day: string; shipments: number }>;
  performance: Array<{ route: string; value: number }>;
  alerts: DashboardAlert[];
};

const fallbackData: DashboardData = {
  kpis: {
    total: 0,
    active: 0,
    delayed: 0,
    clearance: 0,
    transit: 0,
    release: 0,
    returns: 0,
    onTime: 0,
  },
  status: [
    { name: 'Transit', value: 0 },
    { name: 'Clearance', value: 0 },
    { name: 'Delivered', value: 0 },
    { name: 'Delayed', value: 0 },
  ],
  trend: [],
  performance: [],
  alerts: [],
};

function normalizeAlert(input: Record<string, unknown>): DashboardAlert {
  return {
    id: String(input.id || input.shipmentId || input.containerNo || `alert-${Date.now()}`),
    issue: String(input.issue || input.message || input.type || 'Live alert'),
    severity: typeof input.severity === 'string' ? input.severity : undefined,
    type: typeof input.type === 'string' ? input.type : undefined,
  };
}

export function useLiveDashboardData() {
  const [data, setData] = useState<DashboardData>(fallbackData);
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('offline');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [summary, status, trend, performance, alerts] = await Promise.all([
          apiGet<DashboardData['kpis']>('/dashboards/transport-control-tower/summary'),
          apiGet<DashboardData['status']>('/dashboards/transport-control-tower/status'),
          apiGet<DashboardData['trend']>('/dashboards/transport-control-tower/trend'),
          apiGet<DashboardData['performance']>('/dashboards/transport-control-tower/performance'),
          apiGet<Array<{ id: string; issue: string; severity?: string; type?: string }>>('/dashboards/transport-control-tower/alerts'),
        ]);

        if (!active) {
          return;
        }

        setData({
          kpis: summary,
          status: status.length ? status : fallbackData.status,
          trend,
          performance,
          alerts: alerts.map((alert) => normalizeAlert(alert as unknown as Record<string, unknown>)),
        });
      } catch (error) {
        console.error('Dashboard live load failed', error);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const stop = subscribeAdminSocketState((next) => {
      setConnectionState(next);
    });
    const socket = getAdminSocket();
    if (!socket) {
      return stop;
    }

    joinAdminRooms(['dashboard']);

    const onKpis = (kpis: DashboardData['kpis']) => {
      setData((current) => ({ ...current, kpis }));
    };
    const onStatus = (status: DashboardData['status']) => {
      setData((current) => ({ ...current, status }));
    };
    const onTrend = (trend: DashboardData['trend']) => {
      setData((current) => ({ ...current, trend }));
    };
    const onPerformance = (performance: DashboardData['performance']) => {
      setData((current) => ({ ...current, performance }));
    };
    const onAlert = (alert: Record<string, unknown>) => {
      const normalized = normalizeAlert(alert);
      setData((current) => ({
        ...current,
        alerts: [normalized, ...current.alerts.filter((item) => item.id !== normalized.id)].slice(0, 20),
      }));
    };

    socket.on('dashboard:kpis', onKpis);
    socket.on('dashboard:status', onStatus);
    socket.on('dashboard:trend', onTrend);
    socket.on('dashboard:performance', onPerformance);
    socket.on('alert:new', onAlert);

    const fallbackTimer = window.setInterval(() => {
      if (getAdminSocketState() !== 'live') {
        void (async () => {
          try {
            const [summary, status, trend, performance, alerts] = await Promise.all([
              apiGet<DashboardData['kpis']>('/dashboards/transport-control-tower/summary'),
              apiGet<DashboardData['status']>('/dashboards/transport-control-tower/status'),
              apiGet<DashboardData['trend']>('/dashboards/transport-control-tower/trend'),
              apiGet<DashboardData['performance']>('/dashboards/transport-control-tower/performance'),
              apiGet<Array<{ id: string; issue: string; severity?: string; type?: string }>>('/dashboards/transport-control-tower/alerts'),
            ]);
            setData({
              kpis: summary,
              status,
              trend,
              performance,
              alerts: alerts.map((entry) => normalizeAlert(entry as unknown as Record<string, unknown>)),
            });
          } catch (error) {
            console.error('Dashboard fallback refresh failed', error);
          }
        })();
      }
    }, 15000);

    return () => {
      leaveAdminRooms(['dashboard']);
      socket.off('dashboard:kpis', onKpis);
      socket.off('dashboard:status', onStatus);
      socket.off('dashboard:trend', onTrend);
      socket.off('dashboard:performance', onPerformance);
      socket.off('alert:new', onAlert);
      window.clearInterval(fallbackTimer);
      stop();
    };
  }, []);

  return useMemo(
    () => ({
      ...data,
      connectionState,
    }),
    [connectionState, data],
  );
}
