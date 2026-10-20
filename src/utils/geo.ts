import type { LatLng } from '../types';

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Distanza in linea d'aria tra due punti (formula dell'emisenoverso / haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Punto casuale entro `radiusKm` da `center`, distribuito uniformemente sull'area. */
export function randomPointNear(center: LatLng, radiusKm: number, rand: () => number): LatLng {
  const r = radiusKm * Math.sqrt(rand());
  const theta = rand() * 2 * Math.PI;
  const dLat = (r / EARTH_RADIUS_KM) * (180 / Math.PI);
  const dLng = dLat / Math.cos(toRad(center.lat));
  return {
    lat: center.lat + dLat * Math.sin(theta),
    lng: center.lng + dLng * Math.cos(theta),
  };
}
