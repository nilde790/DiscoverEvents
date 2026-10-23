import { useEffect, useState } from 'react';
import type { OrganizerRequest } from '@discoverevent/shared/types';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/format';

const STATUS = {
  pending: { label: 'In attesa', className: 'status-almost-full' },
  approved: { label: 'Approvata', className: 'status-open' },
  rejected: { label: 'Rifiutata', className: 'status-full' },
} as const;

/** Area amministratore: richieste per diventare organizzatore da approvare o rifiutare. */
export function AdminPage() {
  const { currentUser } = useAuth();
  const { notify } = useToast();
  const [onlyPending, setOnlyPending] = useState(true);
  const [requests, setRequests] = useState<OrganizerRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    setRequests(null);
    api
      .adminRequests(onlyPending)
      .then(setRequests)
      .catch((e: Error) => setError(e.message));
  }, [isAdmin, onlyPending]);

  if (!isAdmin) {
    return (
      <div className="page">
        <p className="placeholder">Quest'area è riservata agli amministratori.</p>
      </div>
    );
  }

  const decide = async (request: OrganizerRequest, decision: 'approved' | 'rejected') => {
    try {
      const updated = await api.decideRequest(request.id, decision);
      setRequests((list) =>
        onlyPending ? list!.filter((r) => r.id !== updated.id) : list!.map((r) => (r.id === updated.id ? updated : r)),
      );
      notify(decision === 'approved' ? `${request.user.name} ora è organizzatore` : 'Richiesta rifiutata');
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e), 'error');
    }
  };

  return (
    <div className="page">
      <div className="page-head row-between">
        <div>
          <h1>Richieste organizzatore</h1>
          <p className="muted">Chi viene approvato può pubblicare eventi.</p>
        </div>
        <label className="inline">
          <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
          Solo in attesa
        </label>
      </div>

      {error && <p className="notice error">{error}</p>}
      {!requests && !error && <p className="muted">Caricamento…</p>}
      {requests?.length === 0 && (
        <p className="placeholder">{onlyPending ? 'Nessuna richiesta in attesa.' : 'Nessuna richiesta ricevuta.'}</p>
      )}

      <div className="request-list">
        {requests?.map((r) => (
          <article key={r.id} className="card">
            <div className="row-between">
              <div>
                <h3>{r.user.name}</h3>
                <p className="muted">
                  {r.user.email} · inviata {formatDate(r.createdAt)}
                </p>
              </div>
              <span className={`status ${STATUS[r.status].className}`}>{STATUS[r.status].label}</span>
            </div>
            <p className={r.message ? '' : 'muted'}>{r.message || 'Nessuna motivazione indicata.'}</p>
            {r.status === 'pending' && (
              <div className="row-end">
                <button type="button" className="btn btn-secondary" onClick={() => decide(r, 'rejected')}>
                  Rifiuta
                </button>
                <button type="button" className="btn" onClick={() => decide(r, 'approved')}>
                  Approva
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
