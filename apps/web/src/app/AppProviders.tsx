import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/features/auth/AuthContext';
import { EventsProvider } from '@/features/events/EventsContext';
import { SiteConfigProvider } from '@/features/site-config/SiteConfigContext';

/**
 * Tutti i provider dell'app in un unico punto. L'ordine conta:
 * gli eventi dipendono dall'utente, e tutti e due usano le notifiche.
 * La configurazione del sito (modalità demo, privacy) non dipende da nessuno e sta all'esterno.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <SiteConfigProvider>
        <ToastProvider>
          <AuthProvider>
            <EventsProvider>{children}</EventsProvider>
          </AuthProvider>
        </ToastProvider>
      </SiteConfigProvider>
    </BrowserRouter>
  );
}
