import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ROLE_LABELS } from '@/lib/constants';
import { useAuth } from '@/features/auth/AuthContext';
import { formatDate } from '@/lib/format';

const ROLE_DESCRIPTIONS = {
  participant: 'Puoi iscriverti agli eventi e salvarli tra i preferiti.',
  organizer: 'Puoi anche pubblicare e gestire i tuoi eventi.',
  admin: 'Gestisci le richieste per diventare organizzatore.',
} as const;

/** Dati dell'account e stato della richiesta per diventare organizzatore. */
export function ProfilePage() {
  const { currentUser, organizerRequest, requestOrganizer, refreshSession } = useAuth();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  if (!currentUser) return null; // la rotta è protetta da RequireAuth

  const pending = organizerRequest?.status === 'pending';
  const canRequest = currentUser.role === 'participant' && !pending;

  const send = async () => {
    setBusy(true);
    await requestOrganizer(message).catch(() => {});
    setBusy(false);
  };

  return (
    <div className="page narrow">
      <h1>Il mio profilo</h1>

      <section className="card">
        <dl className="facts big">
          <dt>Nome</dt>
          <dd>{currentUser.name}</dd>
          <dt>Email</dt>
          <dd>{currentUser.email}</dd>
          <dt>Ruolo</dt>
          <dd>
            {ROLE_LABELS[currentUser.role]}
            <div className="muted">{ROLE_DESCRIPTIONS[currentUser.role]}</div>
          </dd>
        </dl>
        {currentUser.role === 'organizer' && (
          <Link to="/organizzatore" className="btn">
            Vai all'area organizzatore
          </Link>
        )}
      </section>

      {currentUser.role === 'participant' && (
        <section className="card">
          <h2>Diventa organizzatore</h2>

          {pending && (
            <>
              <p>
                <span className="status status-almost-full">In attesa</span> Hai inviato la richiesta il{' '}
                {formatDate(organizerRequest.createdAt)}. Un amministratore la valuterà a breve.
              </p>
              <button type="button" className="link" onClick={() => refreshSession().catch(() => {})}>
                Aggiorna lo stato
              </button>
            </>
          )}

          {organizerRequest?.status === 'rejected' && (
            <p className="notice error">
              La tua ultima richiesta non è stata approvata. Puoi inviarne una nuova aggiungendo più dettagli.
            </p>
          )}

          {canRequest && (
            <>
              <p className="muted">
                Gli organizzatori possono pubblicare eventi e vedere chi si iscrive. Un amministratore valuta ogni
                richiesta.
              </p>
              <label className="field">
                <span>Chi sei e che eventi organizzi? (facoltativo)</span>
                <textarea rows={3} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} />
              </label>
              <div>
                <button type="button" className="btn" disabled={busy} onClick={send}>
                  {busy ? 'Invio…' : 'Invia richiesta'}
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
