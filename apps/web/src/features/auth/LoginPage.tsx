import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, type DemoRole } from '@discoverevent/shared/demo';
import { fieldErrors, loginSchema } from '@discoverevent/shared/validation';
import { api, ApiError } from '@/lib/api';
import { Field } from '@/components/ui/Field';
import { useAuth } from '@/features/auth/AuthContext';
import { useSiteConfig } from '@/features/site-config/SiteConfigContext';
import { returnPath } from '@/lib/navigation';

export function LoginPage() {
  const { login, currentUser } = useAuth();
  const { demoMode } = useSiteConfig().config;
  const navigate = useNavigate();
  const location = useLocation();
  const goTo = returnPath(location.search);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  // Gli account demo disponibili li decide il server (in produzione niente amministratore demo).
  const [demoRoles, setDemoRoles] = useState<DemoRole[]>([]);

  useEffect(() => {
    api
      .demoAccounts()
      .then((res) => setDemoRoles(res.roles))
      .catch(() => setDemoRoles([]));
  }, []);

  if (currentUser) return <Navigate to={goTo} replace />;

  async function submit(input: { email: string; password: string }) {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    try {
      await login(parsed.data);
      navigate(goTo, { replace: true });
    } catch (e) {
      setErrors({ form: e instanceof ApiError || e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    submit({ email, password });
  };

  return (
    <div className="page auth-page">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <h1>Accedi</h1>
        {demoMode && (
          <p className="notice">
            Questo sito è una <strong>dimostrazione</strong>: la registrazione è disattivata e si entra solo con gli
            account dimostrativi. I dati tornano quelli iniziali ogni notte.
          </p>
        )}
        <Field label="Email" error={errors.email}>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" error={errors.password}>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {errors.form && <p className="notice error">{errors.form}</p>}
        <button type="submit" className="btn" disabled={busy}>
          {busy ? 'Accesso…' : 'Accedi'}
        </button>
        {!demoMode && (
          <p className="muted">
            Non hai un account? <Link to={`/registrati${location.search}`}>Registrati</Link>
          </p>
        )}
      </form>

      {demoRoles.length > 0 && (
        <section className="auth-card demo-box">
          <h2>{demoMode ? 'Scegli un account demo' : "Vuoi solo provare l'app?"}</h2>
          <p className="muted">
            {demoMode
              ? 'Persone inventate, condivise con tutti i visitatori: non scrivere dati personali reali.'
              : 'Entra con un account dimostrativo, senza registrarti.'}
          </p>
          <div className="demo-buttons">
            {demoRoles
              .map((role) => DEMO_ACCOUNTS[role])
              .map((account) => (
                <button
                  key={account.email}
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={() => submit({ email: account.email, password: DEMO_PASSWORD })}
                >
                  Prova come {account.label.toLowerCase()}
                </button>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
