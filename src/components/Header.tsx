import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export function Header() {
  const { users, currentUser, setCurrentUserId } = useApp();
  const organizers = users.filter((u) => u.role === 'organizer');
  const participants = users.filter((u) => u.role === 'participant');

  return (
    <header className="topbar">
      <NavLink to="/" className="brand">
        DiscoverEvent
      </NavLink>
      <nav className="nav">
        <NavLink to="/" end>Mappa</NavLink>
        <NavLink to="/catalogo">Catalogo</NavLink>
        <NavLink to="/miei-eventi">I miei eventi</NavLink>
        {currentUser?.role === 'organizer' && <NavLink to="/organizzatore">Area organizzatore</NavLink>}
      </nav>
      <label className="user-switch" title="Utenti demo: in un'app reale qui ci sarebbe il login">
        <span>Sei:</span>
        <select value={currentUser?.id ?? ''} onChange={(e) => setCurrentUserId(Number(e.target.value))}>
          <optgroup label="Organizzatori">
            {organizers.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </optgroup>
          <optgroup label="Partecipanti">
            {participants.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </optgroup>
        </select>
      </label>
    </header>
  );
}
