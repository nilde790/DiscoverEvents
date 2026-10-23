import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../shared/demo';
import { fieldErrors, loginSchema } from '../../shared/validation';
import { ApiError } from '../api';
import { Field } from '../components/Field';
import { useApp } from '../context/AppContext';
import { returnPath } from '../utils/navigation';

export function LoginPage() {
  const { login, currentUser } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const goTo = returnPath(location.search);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

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
        <p className="muted">
          Non hai un account? <Link to={`/registrati${location.search}`}>Registrati</Link>
        </p>
      </form>

      <section className="auth-card demo-box">
        <h2>Vuoi solo provare l'app?</h2>
        <p className="muted">Entra con un account dimostrativo, senza registrarti.</p>
        <div className="demo-buttons">
          {Object.values(DEMO_ACCOUNTS).map((account) => (
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
    </div>
  );
}
