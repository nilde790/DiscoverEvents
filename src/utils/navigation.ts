const RETURN_PARAM = 'torna';

/** Link alla pagina di accesso che, dopo il login, riporta a `returnTo`. */
export const loginLink = (returnTo: string) => `/accedi?${RETURN_PARAM}=${encodeURIComponent(returnTo)}`;

/**
 * Pagina a cui tornare dopo il login, letta dall'indirizzo.
 * Accetta solo percorsi interni: un link come ?torna=https://sito-falso.com non deve
 * poter mandare l'utente altrove dopo che ha inserito la password (open redirect).
 */
export function returnPath(search: string, fallback = '/'): string {
  const value = new URLSearchParams(search).get(RETURN_PARAM);
  // "//sito.com" e "/\sito.com" per il browser sono indirizzi esterni.
  return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : fallback;
}
