import { useEffect } from 'react';
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import type { EventSummary } from '@discoverevent/shared/types';
import { categoryClass } from '@/lib/constants';
import type { LatLng } from '@/lib/geo';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

interface Props {
  center: LatLng;
  radiusKm: number;
  events: EventSummary[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

/** Sposta la mappa sull'evento selezionato senza rimontare il componente. */
function FlyTo({ target }: { target: LatLng | null }) {
  const map = useMap();
  const lat = target?.lat;
  const lng = target?.lng;
  // Dipende dalle coordinate, non dall'oggetto: aggiungere ai preferiti non deve far ripartire l'animazione.
  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    // Con "riduci movimento" attivo nel sistema la mappa salta sull'evento senza volo animato.
    const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.6, animate });
  }, [lat, lng, map]);
  return null;
}

/** MapContainer usa `center` solo alla prima apertura: quando il centro cambia (nuova città) la mappa va spostata. */
function Recenter({ center }: { center: LatLng }) {
  const map = useMap();
  const { lat, lng } = center;
  useEffect(() => {
    map.setView([lat, lng], 12);
  }, [lat, lng, map]);
  return null;
}

export function MapView({ center, radiusKm, events, selectedId, onSelect }: Props) {
  const selected = events.find((e) => e.id === selectedId) ?? null;

  return (
    <MapContainer center={[center.lat, center.lng]} zoom={12} className="map">
      <TileLayer attribution={ATTRIBUTION} url={TILE_URL} />
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
        <Tooltip>Centro della ricerca</Tooltip>
      </CircleMarker>

      {selected && (
        <CircleMarker
          // Leaflet applica la classe solo alla creazione: la chiave ricrea l'alone se cambia evento o categoria.
          key={`halo-${selected.id}-${selected.category}`}
          center={[selected.lat, selected.lng]}
          radius={11}
          interactive={false}
          pathOptions={{ className: `marker-halo ${categoryClass(selected.category)}` }}
        />
      )}

      {events.map((e) => {
        const isSelected = e.id === selectedId;
        return (
          <CircleMarker
            // Il colore arriva dalla classe CSS della categoria, che Leaflet applica solo alla creazione.
            key={`${e.id}-${e.category}`}
            center={[e.lat, e.lng]}
            radius={isSelected ? 11 : 7}
            pathOptions={{
              className: `event-marker ${categoryClass(e.category)}`,
              color: isSelected ? '#0f172a' : '#fff',
              weight: isSelected ? 3 : 1.5,
            }}
            eventHandlers={{ click: () => onSelect(e.id) }}
          >
            <Tooltip>{e.title}</Tooltip>
          </CircleMarker>
        );
      })}

      <Recenter center={center} />
      <FlyTo target={selected} />
    </MapContainer>
  );
}

function ClickToPick({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

/** Mappa piccola con un solo punto; se `onChange` è presente, un click sposta il punto. */
export function LocationMap({ value, onChange }: { value: LatLng; onChange?: (p: LatLng) => void }) {
  return (
    <MapContainer center={[value.lat, value.lng]} zoom={14} className={`mini-map ${onChange ? 'pickable' : ''}`}>
      <TileLayer attribution={ATTRIBUTION} url={TILE_URL} />
      <CircleMarker
        center={[value.lat, value.lng]}
        radius={10}
        pathOptions={{ color: '#fff', weight: 3, fillColor: '#4f46e5', fillOpacity: 1 }}
      />
      {onChange && <ClickToPick onPick={onChange} />}
    </MapContainer>
  );
}
