const dateFmt = new Intl.DateTimeFormat('it-IT', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const timeFmt = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' });

export const formatDate = (d: Date | string) => dateFmt.format(new Date(d));

export const formatTime = (d: Date | string) => timeFmt.format(new Date(d));

export const formatPrice = (euro: number) =>
  euro === 0 ? 'Gratis' : euro.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });

export const formatDistance = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

export const endOf = (start: string, durationMinutes: number) =>
  new Date(new Date(start).getTime() + durationMinutes * 60_000);

/** ISO (UTC) -> valore per <input type="datetime-local"> nell'ora locale. */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/** Valore di <input type="datetime-local"> -> ISO (UTC); stringa vuota se non valido. */
export function fromLocalInput(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}
