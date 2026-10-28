import { useEffect } from 'react';
import { latLng } from 'leaflet';
import {
  AttributionControl,
  Circle,
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
  ZoomControl,
} from 'react-leaflet';
import type { EventSummary } from '@discoverevent/shared/types';
import { categoryClass } from '@/lib/constants';
import type { LatLng } from '@/lib/geo';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** Spazio in px coperto da pannelli sopra la mappa: [sopra, destra, sotto, sinistra]. */
export type MapPadding = [number, number, number, number];

interface Props {
  center: LatLng;
  radiusKm: number;
  events: EventSummary[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  /** Spazio coperto quando si inquadra il raggio. */
  padding?: MapPadding;
  /** Spazio coperto quando si vola sull'evento scelto (il pannello col dettaglio può essere più alto). */
  focusPadding?: MapPadding;
}

/** Sposta la mappa sull'evento selezionato senza rimontare il componente. */
function FlyTo({ target, padding }: { target: LatLng | null; padding: MapPadding }) {
  const map = useMap();
  const lat = target?.lat;
  const lng = target?.lng;
  const [top, right, bottom, left] = padding;
  // Dipende dalle coordinate, non dall'oggetto: aggiungere ai preferiti non deve far ripartire l'animazione.
  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    const zoom = Math.max(map.getZoom(), 14);
    // Centro spostato in modo che l'evento cada a metà della parte di mappa non coperta dai pannelli.
    const shifted = map.project([lat, lng], zoom).add([(right - left) / 2, (bottom - top) / 2]);
    // Con "riduci movimento" attivo nel sistema la mappa salta sull'evento senza volo animato.
    const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    map.flyTo(map.unproject(shifted, zoom), zoom, { duration: 0.6, animate });
  }, [lat, lng, map, top, right, bottom, left]);
  return null;
}

/**
 * Inquadra il cerchio del raggio quando cambiano centro o raggio, lasciando fuori lo spazio coperto dai pannelli.
 * MapContainer usa `center` solo alla prima apertura, quindi anche una nuova città passa da qui.
 */
function FitRadius({ center, radiusKm, padding }: { center: LatLng; radiusKm: number; padding: MapPadding }) {
  const map = useMap();
  const { lat, lng } = center;
  const [top, right, bottom, left] = padding;
  useEffect(() => {
    // toBounds vuole il lato del quadrato in metri: il diametro del cerchio.
    const bounds = latLng(lat, lng).toBounds(radiusKm * 2000);
    map.fitBounds(bounds, { paddingTopLeft: [left, top], paddingBottomRight: [right, bottom], animate: false });
  }, [lat, lng, radiusKm, map, top, right, bottom, left]);
  return null;
}

export function MapView({
  center,
  radiusKm,
  events,
  selectedId,
  onSelect,
  padding = [0, 0, 0, 0],
  focusPadding = padding,
}: Props) {
  const selected = events.find((e) => e.id === selectedId) ?? null;

  return (
    // Controlli in basso a sinistra: in alto e a destra ci sono i pannelli della pagina.
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={12}
      className="map"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer attribution={ATTRIBUTION} url={TILE_URL} />
      <ZoomControl position="bottomleft" />
      <AttributionControl position="bottomleft" />
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
          radius={12}
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
            radius={isSelected ? 12 : 9}
            pathOptions={{
              className: `event-marker ${categoryClass(e.category)}`,
              color: isSelected ? '#0f172a' : '#fff',
              weight: isSelected ? 3 : 2.5,
            }}
            eventHandlers={{ click: () => onSelect(e.id) }}
          >
            <Tooltip>{e.title}</Tooltip>
          </CircleMarker>
        );
      })}

      <FitRadius center={center} radiusKm={radiusKm} padding={padding} />
      <FlyTo target={selected} padding={focusPadding} />
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
