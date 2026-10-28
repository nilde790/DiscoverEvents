import { useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { Briefcase, CalendarDays, LayoutGrid, Map as MapIcon, ShieldCheck } from 'lucide-react';
import { ROLE_LABELS } from '@/lib/constants';
import { useAuth } from '@/features/auth/AuthContext';
import { useSiteConfig } from '@/features/site-config/SiteConfigContext';

const MENU_ID = 'menu-principale';

export function Header() {
  const { currentUser, authReady, logout } = useAuth();
  // In modalità demo non ci si registra: resta solo "Accedi", che porta agli account demo.
  const { demoMode } = useSiteConfig().config;
  const navigate = useNavigate();
  // Su telefono navigazione e account stanno in un pannello che si apre col pulsante ☰.
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const onLogout = async () => {
    setMenuOpen(false);
    await logout().catch(() => {});
    navigate('/');
  };

  // Scegliere una voce chiude il pannello.
  const onMenuClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('a')) setMenuOpen(false);
  };

  // Esc chiude il pannello e riporta il focus sul pulsante, così chi usa la tastiera non si perde.
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape' && menuOpen) {
      setMenuOpen(false);
      toggleRef.current?.focus();
    }
  };

  return (
    <header className="topbar" onKeyDown={onKeyDown}>
      <NavLink to="/" className="brand" aria-label="DiscoverEvent, vai alla mappa">
        <span className="brand-mark" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
          </svg>
        </span>
        <span>
          Discover<span className="brand-accent">Event</span>
        </span>
      </NavLink>

      <button
        ref={toggleRef}
        type="button"
        className="menu-toggle"
        aria-expanded={menuOpen}
        aria-controls={MENU_ID}
        aria-label={menuOpen ? 'Chiudi il menu' : 'Apri il menu'}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className="menu-icon" aria-hidden="true" />
      </button>

      <div id={MENU_ID} className={`menu ${menuOpen ? 'open' : ''}`} onClick={onMenuClick}>
        <nav className="nav" aria-label="Navigazione principale">
          <NavLink to="/" end>
            <MapIcon size={16} aria-hidden="true" /> Mappa
          </NavLink>
          <NavLink to="/catalogo">
            <LayoutGrid size={16} aria-hidden="true" /> Catalogo
          </NavLink>
          {currentUser && (
            <NavLink to="/miei-eventi">
              <CalendarDays size={16} aria-hidden="true" /> I miei eventi
            </NavLink>
          )}
          {currentUser?.role === 'organizer' && (
            <NavLink to="/organizzatore">
              <Briefcase size={16} aria-hidden="true" /> Area organizzatore
            </NavLink>
          )}
          {currentUser?.role === 'admin' && (
            <NavLink to="/admin">
              <ShieldCheck size={16} aria-hidden="true" /> Amministrazione
            </NavLink>
          )}
        </nav>

        {/* Finché non si sa se c'è una sessione non si mostra nulla, per evitare un "Accedi" che lampeggia. */}
        {authReady && (
          <div className="account">
            {currentUser ? (
              <>
                <Link to="/profilo" className="account-name">
                  <span className="avatar" aria-hidden="true">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="account-text">
                    <span>{currentUser.name}</span>
                    <small>{ROLE_LABELS[currentUser.role]}</small>
                  </span>
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
                {!demoMode && (
                  <Link to="/registrati" className="btn">
                    Registrati
                  </Link>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
