import { useEffect } from 'react';
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { CATEGORY_COLORS } from '../services';
import type { EventWithDistance, LatLng } from '../types';

interface Props {
  center: LatLng;
  radiusKm: number;
  events: EventWithDistance[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Sposta la mappa sull'evento selezionato senza rimontare il componente. */
function FlyToSelected({ target }: { target: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [target, map]);
  return null;
}

export function MapView({ center, radiusKm, events, selectedId, onSelect }: Props) {
  const selected = events.find((e) => e.id === selectedId) ?? null;

  return (
    <MapContainer center={[center.lat, center.lng]} zoom={12} className="map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Circle
        center={[center.lat, center.lng]}
        radius={radiusKm * 1000}
        pathOptions={{ color: '#64748b', weight: 1, fillOpacity: 0.04, dashArray: '4 4' }}
      />
      <CircleMarker
        center={[center.lat, center.lng]}
        radius={8}
        pathOptions={{ color: '#fff', weight: 3, fillColor: '#0f172a', fillOpacity: 1 }}
      >
        <Tooltip>Sei qui</Tooltip>
      </CircleMarker>

      {events.map((e) => {
        const isSelected = e.id === selectedId;
        return (
          <CircleMarker
            key={e.id}
            center={[e.position.lat, e.position.lng]}
            radius={isSelected ? 11 : 7}
            pathOptions={{
              color: isSelected ? '#0f172a' : '#fff',
              weight: isSelected ? 3 : 1.5,
              fillColor: CATEGORY_COLORS[e.category],
              fillOpacity: 0.9,
            }}
            eventHandlers={{ click: () => onSelect(e.id) }}
          >
            <Tooltip>{e.title}</Tooltip>
          </CircleMarker>
        );
      })}

      <FlyToSelected target={selected?.position ?? null} />
    </MapContainer>
  );
}
