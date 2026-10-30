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

/** Durata leggibile: "45 min", "1 ora", "2 ore e 30 min". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  const label = hours === 1 ? '1 ora' : `${hours} ore`;
  return rest === 0 ? label : `${label} e ${rest} min`;
}

export const formatDistance = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

const dayFmt = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
const longDayFmt = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'short' });

/** Mezzanotte locale del giorno di `d`: stessa ora locale usata da formatDate, così gruppi e date coincidono. */
export const startOfDay = (d: Date | string) => {
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  return day;
};

/** Titolo di un gruppo di eventi: "Oggi · mer 28 ott", "Domani · gio 29 ott", "Venerdì 30 ott". */
export function formatDayHeading(day: Date, now = new Date()): string {
  const diff = Math.round((startOfDay(day).getTime() - startOfDay(now).getTime()) / 86_400_000);
  if (diff === 0) return `Oggi · ${dayFmt.format(day)}`;
  if (diff === 1) return `Domani · ${dayFmt.format(day)}`;
  const label = longDayFmt.format(day);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

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
