/**
 * Account dimostrativi creati con i dati demo. La password è pubblica di proposito:
 * servono a chi visita il progetto per provarlo con un clic dalla pagina di accesso.
 */
export const DEMO_PASSWORD = 'demo1234';

export const DEMO_ACCOUNTS = {
  participant: { email: 'giulia.rossi@example.com', label: 'Partecipante' },
  organizer: { email: 'techcommunity@example.com', label: 'Organizzatore' },
  admin: { email: 'admin@example.com', label: 'Amministratore' },
} as const;

export type DemoRole = keyof typeof DEMO_ACCOUNTS;
