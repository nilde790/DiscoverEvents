import { Link } from 'react-router-dom';
import { registrationStatus } from '@discoverevent/shared/types';
import { StatusBadge } from '@/features/events/components/EventBadges';
import { useAuth } from '@/features/auth/AuthContext';
import { useEvents } from '@/features/events/EventsContext';
import { formatDate } from '@/lib/format';

/** Area organizzatore: elenco dei propri eventi con stato iscrizioni e azioni di gestione. */
export function OrganizerPage() {
  const { currentUser } = useAuth();
  const { events, deleteEvent } = useEvents();

  if (currentUser?.role !== 'organizer') {
    return (
      <div className="page">
        <h1>Area organizzatore</h1>
        <p className="placeholder">
          Quest'area è riservata agli organizzatori. Puoi chiedere di diventarlo dal tuo <Link to="/profilo">profilo</Link>.
        </p>
      </div>
    );
  }

  const mine = events.filter((e) => e.organizer.id === currentUser.id);
  const active = mine.filter((e) => registrationStatus(e) !== 'closed');
  // Prima i prossimi eventi (dal più vicino), poi quelli conclusi (dal più recente).
  const past = mine.filter((e) => registrationStatus(e) === 'closed').reverse();
  const rows = [...active, ...past];
  const totalRegistered = active.reduce((sum, e) => sum + e.registeredCount, 0);
  const totalCapacity = active.reduce((sum, e) => sum + e.capacity, 0);

  const confirmDelete = (id: number, title: string, registered: number) => {
    const warning = registered > 0 ? `\n\nAttenzione: ${registered} persone sono iscritte.` : '';
    if (window.confirm(`Eliminare "${title}"?${warning}`)) deleteEvent(id).catch(() => {});
  };

  return (
    <div className="page">
      <div className="page-head row-between">
        <div>
          <h1>Area organizzatore</h1>
          <p className="muted">{currentUser.name}</p>
        </div>
        <Link to="/organizzatore/nuovo" className="btn">+ Nuovo evento</Link>
      </div>

      <div className="stats">
        <div className="stat"><span className="stat-value">{active.length}</span><span className="stat-label">Eventi in programma</span></div>
        <div className="stat"><span className="stat-value">{totalRegistered}</span><span className="stat-label">Iscritti totali</span></div>
        <div className="stat">
          <span className="stat-value">{totalCapacity ? Math.round((totalRegistered / totalCapacity) * 100) : 0}%</span>
          <span className="stat-label">Posti occupati</span>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Evento</th>
              <th>Data</th>
              <th>Iscritti</th>
              <th>Stato</th>
              <th aria-label="Azioni" />
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className={registrationStatus(e) === 'closed' ? 'past' : ''}>
                <td><Link to={`/eventi/${e.id}`}>{e.title}</Link></td>
                <td>{formatDate(e.start)}</td>
                <td>{e.registeredCount} / {e.capacity}</td>
                <td><StatusBadge event={e} /></td>
                <td className="row-actions">
                  {registrationStatus(e) !== 'closed' && <Link to={`/organizzatore/eventi/${e.id}/modifica`}>Modifica</Link>}
                  <button type="button" className="link danger" onClick={() => confirmDelete(e.id, e.title, e.registeredCount)}>
                    Elimina
                  </button>
                </td>
              </tr>
            ))}
            {mine.length === 0 && (
              <tr><td colSpan={5} className="muted">Non hai ancora creato eventi.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
