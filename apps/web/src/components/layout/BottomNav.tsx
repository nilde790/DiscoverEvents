import { NavLink } from 'react-router';
import { CalendarDays, LayoutGrid, LogIn, Map as MapIcon, UserRound } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';

/**
 * Barra in basso con le sezioni principali, solo su telefono (il CSS la nasconde sugli schermi larghi).
 * Le voci secondarie (organizzatore, amministrazione, esci) restano nel menu ☰ dell'Header.
 */
export function BottomNav() {
  const { currentUser, authReady } = useAuth();
  return (
    <nav className="bottom-nav" aria-label="Sezioni principali">
      <NavLink to="/" end>
        <MapIcon size={22} aria-hidden="true" />
        Mappa
      </NavLink>
      <NavLink to="/catalogo">
        <LayoutGrid size={22} aria-hidden="true" />
        Catalogo
      </NavLink>
      {/* Senza accesso la voce resta: porta al login e poi torna qui. */}
      <NavLink to="/miei-eventi">
        <CalendarDays size={22} aria-hidden="true" />I miei eventi
      </NavLink>
      {/* Finché non si sa se c'è una sessione, la quarta voce resta vuota per non far lampeggiare "Accedi". */}
      {!authReady ? (
        <span aria-hidden="true" />
      ) : currentUser ? (
        <NavLink to="/profilo">
          <UserRound size={22} aria-hidden="true" />
          Profilo
        </NavLink>
      ) : (
        <NavLink to="/accedi">
          <LogIn size={22} aria-hidden="true" />
          Accedi
        </NavLink>
      )}
    </nav>
  );
}
