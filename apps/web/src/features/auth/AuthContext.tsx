import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { OrganizerRequest, User } from '@discoverevent/shared/types';
import type { LoginInput, RegisterInput } from '@discoverevent/shared/validation';
import { errorMessage, useToast } from '@/components/ui/Toast';
import { api, type SessionInfo } from '@/lib/api';

interface AuthState {
  /** null = visitatore non autenticato. */
  currentUser: User | null;
  /** Ultima richiesta per diventare organizzatore dell'utente corrente, se esiste. */
  organizerRequest: OrganizerRequest | null;
  /** false finché non si sa se c'è una sessione attiva (evita di mostrare "Accedi" per un attimo). */
  authReady: boolean;
  /** Errore nel contattare il server all'avvio. */
  authError: string | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  requestOrganizer: (message: string) => Promise<void>;
  /** Ricarica utente e richiesta dal server (es. dopo un'approvazione). */
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/** Sessione dell'utente: chi è, che ruolo ha, accesso e uscita. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { notify } = useToast();
  const [session, setSession] = useState<SessionInfo>({ user: null, organizerRequest: null });
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    setSession(await api.me());
  }, []);

  // All'avvio: c'è già una sessione (cookie) attiva?
  useEffect(() => {
    refreshSession()
      .catch((e: Error) => setAuthError(e.message))
      .finally(() => setAuthReady(true));
  }, [refreshSession]);

  const value: AuthState = {
    currentUser: session.user,
    organizerRequest: session.organizerRequest,
    authReady,
    authError,
    // Login e registrazione lanciano gli errori al form, che li mostra sotto i campi.
    login: async (input) => {
      const info = await api.login(input);
      setSession(info);
      notify(`Ciao, ${info.user?.name}!`);
    },
    register: async (input) => {
      const info = await api.register(input);
      setSession(info);
      notify(info.organizerRequest ? 'Account creato: la richiesta da organizzatore è in attesa' : 'Account creato!');
    },
    logout: async () => {
      try {
        await api.logout();
        notify('Sei uscito dal tuo account');
      } catch (e) {
        notify(errorMessage(e), 'error');
        throw e;
      }
      setSession({ user: null, organizerRequest: null });
    },
    requestOrganizer: async (message) => {
      try {
        const request = await api.requestOrganizer(message);
        notify('Richiesta inviata');
        setSession((s) => ({ ...s, organizerRequest: request }));
      } catch (e) {
        notify(errorMessage(e), 'error');
        throw e;
      }
    },
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth va usato dentro <AuthProvider>');
  return ctx;
}
