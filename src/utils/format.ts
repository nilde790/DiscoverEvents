const dateFmt = new Intl.DateTimeFormat('it-IT', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export const formatDate = (d: Date) => dateFmt.format(d);

export const formatPrice = (euro: number) =>
  euro === 0 ? 'Gratis' : euro.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });

export const formatDistance = (km: number) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
