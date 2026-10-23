import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type ToastKind = 'ok' | 'error';

interface Toast {
  id: number;
  text: string;
  kind: ToastKind;
}

interface ToastState {
  notify: (text: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastState | null>(null);
const TOAST_DURATION_MS = 3500;

/** Messaggi brevi in basso allo schermo ("Iscrizione confermata!", errori...). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);

  const notify = useCallback((text: string, kind: ToastKind = 'ok') => {
    const id = Date.now();
    setToast({ id, text, kind });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), TOAST_DURATION_MS);
  }, []);

  // Il valore del contesto non cambia quando compare un messaggio: chi usa solo notify non viene ridisegnato.
  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <div key={toast.id} className={`toast ${toast.kind}`} role="status">
          {toast.text}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastState {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast va usato dentro <ToastProvider>');
  return ctx;
}

/** Messaggio leggibile da qualsiasi errore. */
export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));
