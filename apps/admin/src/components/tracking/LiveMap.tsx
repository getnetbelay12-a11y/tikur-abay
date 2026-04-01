// @ts-nocheck
'use client';

import { useEffect } from 'react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, ZoomControl, useMap } from 'react-leaflet';

export type LiveMapStop = {
  name: string;
  status: string;
  lat: number;
  lng: number;
};

export type LiveMapShipment = {
  route: Array<[number, number]>;
  stops: LiveMapStop[];
  currentPosition?: [number, number] | null;
  currentLabel?: string;
};

function toneForStatus(status: string) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('deliver')) return '#16a34a';
  if (normalized.includes('delay') || normalized.includes('hold') || normalized.includes('overdue')) return '#dc2626';
  if (normalized.includes('clearance') || normalized.includes('release')) return '#f59e0b';
  return '#2563eb';
}

function RouteBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) {
      return;
    }
    if (points.length === 1) {
      map.setView(points[0], 6);
      return;
    }
    map.fitBounds(points, { padding: [24, 24] });
  }, [map, points]);

  return null;
}

export default function LiveMap({ shipment }: { shipment: LiveMapShipment }) {
  const route = Array.isArray(shipment.route) ? shipment.route.filter((point) => Array.isArray(point) && point.length === 2) : [];
  const stops = Array.isArray(shipment.stops) ? shipment.stops.filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng)) : [];
  const pathPoints = route.length ? route : stops.map((stop) => [stop.lat, stop.lng] as [number, number]);
  const center = shipment.currentPosition || pathPoints[pathPoints.length - 1] || [9.03, 38.74];

  return (
    <div className="tracking-live-map">
      <div className="tracking-live-map-route">
        {stops.map((stop) => stop.name).join(' \u2192 ') || 'Shanghai \u2192 Djibouti \u2192 Modjo'}
      </div>
      <div className="tracking-live-map-frame">
        <MapContainer center={center as [number, number]} zoom={5} className="tracking-live-map-canvas" scrollWheelZoom zoomControl={false}>
          <ZoomControl position="bottomright" />
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <RouteBounds points={pathPoints} />
          {pathPoints.length > 1 ? <Polyline positions={pathPoints} pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.78 }} /> : null}
          {stops.map((stop) => (
            <CircleMarker
              key={`${stop.name}-${stop.lat}-${stop.lng}`}
              center={[stop.lat, stop.lng]}
              radius={8}
              pathOptions={{ color: toneForStatus(stop.status), fillColor: toneForStatus(stop.status), fillOpacity: 0.9, weight: 2 }}
            >
              <Popup>
                <strong>{stop.name}</strong>
                <div>{stop.status}</div>
              </Popup>
            </CircleMarker>
          ))}
          {shipment.currentPosition ? (
            <CircleMarker
              center={shipment.currentPosition}
              radius={10}
              pathOptions={{ color: '#0f172a', fillColor: '#2563eb', fillOpacity: 1, weight: 3 }}
            >
              <Popup>
                <strong>{shipment.currentLabel || 'Current shipment position'}</strong>
              </Popup>
            </CircleMarker>
          ) : null}
        </MapContainer>
      </div>
    </div>
  );
}
