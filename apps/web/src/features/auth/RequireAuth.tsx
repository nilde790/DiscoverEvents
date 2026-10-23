import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '@/features/events/EventsContext';
import { loginLink } from '@/lib/navigation';

/**
 * Protegge le pagine che richiedono l'accesso: chi non è autenticato va alla pagina di login
 * e poi torna qui. È solo una comodità dell'interfaccia: i permessi veri li controlla il server.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { currentUser, authReady } = useApp();
  const location = useLocation();

  if (!authReady) return <div className="page muted">Caricamento…</div>;
  if (!currentUser) return <Navigate to={loginLink(location.pathname)} replace />;
  return <>{children}</>;
}
