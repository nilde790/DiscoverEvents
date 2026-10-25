import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { fieldErrors, registerSchema } from '@discoverevent/shared/validation';
import { ApiError } from '@/lib/api';
import { Field } from '@/components/ui/Field';
import { useAuth } from '@/features/auth/AuthContext';
import { useSiteConfig } from '@/features/site-config/SiteConfigContext';
import { returnPath } from '@/lib/navigation';

export function RegisterPage() {
  const { register, currentUser } = useAuth();
  const { config, configReady } = useSiteConfig();
  const navigate = useNavigate();
  const location = useLocation();

  const [values, setValues] = useState({ name: '', email: '', password: '', organizerMessage: '' });
  const [wantsOrganizer, setWantsOrganizer] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (currentUser) return <Navigate to={returnPath(location.search)} replace />;
  if (!configReady) return <div className="page auth-page" />;
  // In modalità demo il server rifiuta comunque la registrazione: qui si evita solo di far compilare un form inutile.
  if (config.demoMode) {
    return (
      <div className="page auth-page">
        <section className="auth-card">
          <h1>Registrazione non disponibile</h1>
          <p>
            Questo sito è una <strong>dimostrazione</strong>: per non raccogliere dati personali la registrazione è
            disattivata. Puoi provare tutte le funzioni con un account dimostrativo, da partecipante, organizzatore o
            amministratore.
          </p>
          <Link to={`/accedi${location.search}`} className="btn">
            Entra con un account demo
          </Link>
        </section>
      </div>
    );
  }

  const set = (key: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const parsed = registerSchema.safeParse({ ...values, wantsOrganizer });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    try {
      await register(parsed.data);
      navigate(wantsOrganizer ? '/profilo' : returnPath(location.search), { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.fields) setErrors(e.fields);
      else setErrors({ form: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page auth-page">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <h1>Crea un account</h1>
        <Field label="Nome (visibile agli organizzatori)" error={errors.name}>
          <input autoComplete="name" value={values.name} onChange={set('name')} />
        </Field>
        <Field label="Email" error={errors.email}>
          <input type="email" autoComplete="email" value={values.email} onChange={set('email')} />
        </Field>
        <Field label="Password (almeno 8 caratteri)" error={errors.password}>
          <input type="password" autoComplete="new-password" value={values.password} onChange={set('password')} />
        </Field>

        <label className="checkbox">
          <input type="checkbox" checked={wantsOrganizer} onChange={(e) => setWantsOrganizer(e.target.checked)} />
          <span>
            Voglio anche <strong>organizzare eventi</strong>
            <small className="muted"> — la richiesta verrà valutata da un amministratore</small>
          </span>
        </label>
        {wantsOrganizer && (
          <Field label="Raccontaci chi sei e che eventi organizzi (facoltativo)" error={errors.organizerMessage}>
            <textarea rows={3} maxLength={500} value={values.organizerMessage} onChange={set('organizerMessage')} />
          </Field>
        )}

        {errors.form && <p className="notice error">{errors.form}</p>}
        <p className="muted">
          Creando l&apos;account confermi di aver letto l&apos;
          <Link to="/privacy">informativa sulla privacy</Link>, che spiega quali dati salviamo e perché.
        </p>
        <button type="submit" className="btn" disabled={busy}>
          {busy ? 'Creazione…' : 'Crea account'}
        </button>
        <p className="muted">
          Hai già un account? <Link to={`/accedi${location.search}`}>Accedi</Link>
        </p>
      </form>
    </div>
  );
}
