import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ROLE_LABELS } from '@/lib/constants';
import { useAuth } from '@/features/auth/AuthContext';

export function Header() {
  const { currentUser, authReady, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout().catch(() => {});
    navigate('/');
  };

  return (
    <header className="topbar">
      <NavLink to="/" className="brand">
        DiscoverEvent
      </NavLink>
      <nav className="nav">
        <NavLink to="/" end>
          Mappa
        </NavLink>
        <NavLink to="/catalogo">Catalogo</NavLink>
        {currentUser && <NavLink to="/miei-eventi">I miei eventi</NavLink>}
        {currentUser?.role === 'organizer' && <NavLink to="/organizzatore">Area organizzatore</NavLink>}
        {currentUser?.role === 'admin' && <NavLink to="/admin">Amministrazione</NavLink>}
      </nav>

      {/* Finché non si sa se c'è una sessione non si mostra nulla, per evitare un "Accedi" che lampeggia. */}
      {authReady && (
        <div className="account">
          {currentUser ? (
            <>
              <Link to="/profilo" className="account-name">
                <span>{currentUser.name}</span>
                <small>{ROLE_LABELS[currentUser.role]}</small>
              </Link>
              <button type="button" className="btn btn-secondary" onClick={onLogout}>
                Esci
              </button>
            </>
          ) : (
            <>
              <Link to="/accedi" className="btn btn-secondary">
                Accedi
              </Link>
              <Link to="/registrati" className="btn">
                Registrati
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
