import React from 'react';
import { useDashboardData } from '../../hooks/useDashboardData';
import LiveMap, { type LiveMapShipment } from '../tracking/LiveMap';

type StatusProps = {
  label: string;
  value: string | number;
  color?: string;
};

type MetricProps = {
  label: string;
  value: string | number;
};

type MiniMetricProps = {
  label: string;
  value: string | number;
};

type RiskProps = {
  label: string;
  value: string | number;
  color?: 'red' | 'yellow';
};

type BarProps = {
  label: string;
  value: number;
};

type AlertProps = {
  shipment: string;
  issue: string;
  severity?: string;
};

export default function ExecutiveControlTower() {
  const { kpis, status, trend, performance, alerts, connectionState } = useDashboardData();
  const kpiItems = [
    { label: 'Total Shipments', value: kpis.total },
    { label: 'Active', value: kpis.active },
    { label: 'Delayed', value: kpis.delayed, color: 'text-red-600' },
    { label: 'Clearance', value: kpis.clearance },
    { label: 'In Transit', value: kpis.transit },
    { label: 'Ready Release', value: kpis.release },
    { label: 'Empty Return', value: kpis.returns },
    { label: 'On-Time %', value: `${kpis.onTime}%`, color: 'text-green-600' },
  ];
  const liveMapShipment: LiveMapShipment = {
    route: [
      [31.23, 121.47],
      [11.6, 43.15],
      [8.98, 39.27],
    ],
    stops: [
      { name: 'Shanghai', status: kpis.total > 0 ? 'Loaded' : 'Awaiting booking', lat: 31.23, lng: 121.47 },
      { name: 'Djibouti', status: kpis.clearance > 0 ? 'Arrived for clearance' : 'At sea', lat: 11.6, lng: 43.15 },
      { name: performance[0]?.route || 'Modjo', status: kpis.release > 0 ? 'Release ready' : kpis.transit > 0 ? 'In transit inland' : 'Pending', lat: 8.98, lng: 39.27 },
    ],
    currentPosition: kpis.transit > 0 ? [11.6, 43.15] : [8.98, 39.27],
    currentLabel: kpis.transit > 0 ? 'Corridor shipments in motion' : 'Most active inland corridor',
  };

  return (
    <div className="executive-control-tower space-y-4">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="text-xs text-gray-500">Executive transportation control tower</div>
          <div className="text-sm font-semibold">Live operational summary</div>
        </div>
        <span className={`status-badge ${connectionState === 'live' ? 'good' : connectionState === 'reconnecting' ? 'warning' : 'info'}`}>
          {connectionState === 'live' ? 'Live' : connectionState === 'reconnecting' ? 'Reconnecting' : 'Offline fallback'}
        </span>
      </div>

      <div className="grid grid-cols-8 gap-3">
        {kpiItems.map((kpi, i) => (
          <div key={`${kpi.label}-${i}`} className="bg-white border rounded-xl p-3 shadow-sm">
            <div className={`text-2xl font-bold ${kpi.color || ''}`}>
              {kpi.value}
            </div>
            <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-3">
              Shipment Status Overview
            </h3>

            <div className="grid grid-cols-4 text-center">
              {status.map((item) => (
                <Status
                  key={item.name}
                  label={item.name}
                  value={item.value}
                  color={
                    item.name === 'Transit'
                      ? 'text-blue-600'
                      : item.name === 'Clearance'
                        ? 'text-yellow-500'
                        : item.name === 'Delivered'
                          ? 'text-green-600'
                          : 'text-red-600'
                  }
                />
              ))}
            </div>
          </div>

          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-3">
              Shipment Trend (Last 30 Days)
            </h3>

            <div className="h-24 flex items-end gap-2">
              {trend.map((item, i) => (
                <div
                  key={`trend-${item.day}-${i}`}
                  className="bg-blue-500 w-full rounded-sm"
                  style={{ height: `${item.shipments}%` }}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 text-xs text-gray-500 mt-3">
              <MiniMetric label="Transit Avg" value="12 days" />
              <MiniMetric label="Clearance Avg" value="3.5 days" />
              <MiniMetric label="Delivery Avg" value="2 days" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-3">
              Bottlenecks &amp; Risk
            </h3>

            <ul className="space-y-2 text-sm">
              <Risk label="LC Discrepancies" value={5} color="red" />
              <Risk label="Pending Approval" value={12} color="yellow" />
              <Risk label="Missing Docs" value={7} />
              <Risk label="Clearance Delay" value={9} color="yellow" />
              <Risk label="Empty Return Late" value={3} color="red" />
            </ul>
          </div>

          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-3">
              Finance Snapshot
            </h3>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <Metric label="Revenue" value="$789K" />
              <Metric label="Pending" value="$120K" />
              <Metric label="Cleared" value="$669K" />
              <Metric label="Driver Reimb." value="$15K" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-3">
            Carrier / Corridor Performance
          </h3>

          {performance.map((item) => (
            <Bar key={item.route} label={item.route} value={item.value} />
          ))}
        </div>

        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-semibold text-sm text-red-600 mb-3">
            Attention Now
          </h3>

          <div className="space-y-3 text-sm">
            {alerts.map((alert) => (
              <Alert
                key={alert.id}
                shipment={alert.id}
                issue={alert.issue}
                severity={alert.severity}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div>
            <h3 className="font-semibold text-sm">Live Alerts Feed</h3>
            <div className="text-xs text-gray-500">Newest operational exceptions, finance changes, and shipment releases</div>
          </div>
          <span className={`status-badge ${connectionState === 'live' ? 'good' : connectionState === 'reconnecting' ? 'warning' : 'info'}`}>
            {alerts.length} live items
          </span>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {alerts.slice(0, 10).map((alert) => (
            <div
              key={`feed-${alert.id}-${alert.issue}`}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                gap: 12,
                alignItems: 'center',
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                background: '#f8fafc',
              }}
            >
              <span className={`status-badge ${
                alert.severity === 'critical' || alert.severity === 'high'
                  ? 'critical'
                  : alert.severity === 'warning'
                    ? 'warning'
                    : alert.severity === 'good'
                      ? 'good'
                      : 'info'
              }`}
              >
                {alert.severity || 'info'}
              </span>
              <div style={{ minWidth: 0 }}>
                <div className="font-semibold text-sm">{alert.id}</div>
                <div className="text-xs text-gray-500">{alert.issue}</div>
              </div>
              <button className="text-xs bg-blue-600 text-white px-2 py-1 rounded" type="button">
                Open
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-3">
          Live Shipment Map
        </h3>
        <LiveMap shipment={liveMapShipment} />
      </div>
    </div>
  );
}

function Status({ label, value, color }: StatusProps) {
  return (
    <div>
      <div className={`text-lg font-bold ${color || ''}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className="bg-gray-50 p-2 rounded text-center">
      <div className="font-semibold">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function MiniMetric({ label, value }: MiniMetricProps) {
  return (
    <div>
      <div className="font-semibold text-gray-700">{value}</div>
      <div>{label}</div>
    </div>
  );
}

function Risk({ label, value, color }: RiskProps) {
  return (
    <li className="flex justify-between">
      <span>{label}</span>
      <span
        className={`font-semibold ${
          color === 'red'
            ? 'text-red-600'
            : color === 'yellow'
              ? 'text-yellow-600'
              : ''
        }`}
      >
        {value}
      </span>
    </li>
  );
}

function Bar({ label, value }: BarProps) {
  return (
    <div className="mb-2">
      <div className="text-xs mb-1">{label}</div>
      <div className="w-full bg-gray-200 h-2 rounded">
        <div
          className="bg-blue-600 h-2 rounded"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function Alert({ shipment, issue, severity }: AlertProps) {
  const tone = severity === 'critical' || severity === 'high'
    ? 'critical'
    : severity === 'warning'
      ? 'warning'
      : 'info';
  return (
    <div className="border p-2 rounded flex justify-between items-center">
      <div>
        <div className="font-medium">{shipment}</div>
        <div className="text-xs text-gray-500">{issue}</div>
      </div>
      <div style={{ display: 'grid', gap: 6, justifyItems: 'end' }}>
        <span className={`status-badge ${tone}`}>{severity || 'live'}</span>
        <button className="text-xs bg-blue-600 text-white px-2 py-1 rounded" type="button">
          Resolve
        </button>
      </div>
    </div>
  );
}
