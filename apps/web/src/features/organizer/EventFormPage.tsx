import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CATEGORIES, type EventInput } from '../../shared/types';
import { eventInputSchema, fieldErrors } from '../../shared/validation';
import { api, ApiError } from '../api';
import { Field } from '../components/Field';
import { LocationMap } from '../components/MapView';
import { FALLBACK_CENTER } from '../constants';
import { useApp } from '../context/AppContext';
import { fromLocalInput, toLocalInput } from '../utils/format';

/** Valori del form: i numeri restano stringhe finché l'utente scrive, si convertono all'invio. */
interface FormValues {
  title: string;
  category: EventInput['category'];
  description: string;
  venue: string;
  lat: number;
  lng: number;
  start: string;
  durationMinutes: string;
  price: string;
  capacity: string;
}

function emptyForm(): FormValues {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(20, 0, 0, 0);
  return {
    title: '',
    category: 'Musica',
    description: '',
    venue: '',
    ...FALLBACK_CENTER,
    start: toLocalInput(tomorrow.toISOString()),
    durationMinutes: '120',
    price: '0',
    capacity: '50',
  };
}

const toInput = (v: FormValues): EventInput => ({
  ...v,
  start: fromLocalInput(v.start),
  durationMinutes: Number(v.durationMinutes),
  price: Number(v.price.replace(',', '.')),
  capacity: Number(v.capacity),
});

/** Creazione (/organizzatore/nuovo) e modifica (/organizzatore/eventi/:id/modifica) di un evento. */
export function EventFormPage() {
  const { id } = useParams();
  const editingId = id ? Number(id) : undefined;
  const navigate = useNavigate();
  const { currentUser, saveEvent } = useApp();

  const [values, setValues] = useState<FormValues | null>(editingId ? null : emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editingId) return;
    api
      .event(editingId)
      .then((e) =>
        setValues({
          title: e.title,
          category: e.category,
          description: e.description,
          venue: e.venue,
          lat: e.lat,
          lng: e.lng,
          start: toLocalInput(e.start),
          durationMinutes: String(e.durationMinutes),
          price: String(e.price),
          capacity: String(e.capacity),
        }),
      )
      .catch((e: Error) => setLoadError(e.message));
  }, [editingId]);

  if (currentUser?.role !== 'organizer') {
    return <div className="page"><p className="placeholder">Solo gli organizzatori possono creare o modificare eventi.</p></div>;
  }
  if (loadError) return <div className="page"><p className="notice error">{loadError}</p></div>;
  if (!values) return <div className="page muted">Caricamento…</div>;

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((v) => (v ? { ...v, [key]: value } : v));

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!values) return;
    const input = toInput(values);

    // Prima la validazione locale (risposta immediata), poi quella del server (quella che conta).
    const parsed = eventInputSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setSaving(true);
    try {
      const saved = await saveEvent(parsed.data, editingId);
      navigate(`/eventi/${saved.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.fields) setErrors(e.fields);
      else setErrors({ form: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <Link to="/organizzatore" className="link">← Area organizzatore</Link>
      <h1>{editingId ? 'Modifica evento' : 'Nuovo evento'}</h1>

      <form className="event-form" onSubmit={onSubmit} noValidate>
        <div className="form-grid">
          <Field label="Titolo" error={errors.title}>
            <input value={values.title} onChange={(e) => set('title', e.target.value)} maxLength={100} />
          </Field>
          <Field label="Categoria" error={errors.category}>
            <select value={values.category} onChange={(e) => set('category', e.target.value as FormValues['category'])}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Descrizione" error={errors.description}>
            <textarea rows={4} value={values.description} onChange={(e) => set('description', e.target.value)} />
          </Field>
          <Field label="Inizio" error={errors.start}>
            <input type="datetime-local" value={values.start} onChange={(e) => set('start', e.target.value)} />
          </Field>
          <Field label="Durata (minuti)" error={errors.durationMinutes}>
            <input type="number" min={15} step={15} value={values.durationMinutes} onChange={(e) => set('durationMinutes', e.target.value)} />
          </Field>
          <Field label="Prezzo (€, 0 = gratis)" error={errors.price}>
            <input inputMode="decimal" value={values.price} onChange={(e) => set('price', e.target.value)} />
          </Field>
          <Field label="Posti disponibili" error={errors.capacity}>
            <input type="number" min={1} value={values.capacity} onChange={(e) => set('capacity', e.target.value)} />
          </Field>
          <Field label="Luogo" error={errors.venue}>
            <input value={values.venue} onChange={(e) => set('venue', e.target.value)} placeholder="Es. Teatro Comunale" />
          </Field>
        </div>

        <div className="field">
          <span>Posizione sulla mappa <span className="muted">(clicca per spostare il punto)</span></span>
          <LocationMap value={values} onChange={(p) => setValues((v) => (v ? { ...v, ...p } : v))} />
        </div>

        {errors.form && <p className="notice error">{errors.form}</p>}
        <div className="row-end">
          <Link to="/organizzatore" className="btn btn-secondary">Annulla</Link>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Salvataggio…' : editingId ? 'Salva modifiche' : 'Crea evento'}
          </button>
        </div>
      </form>
    </div>
  );
}
