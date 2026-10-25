import { Link } from 'react-router';
import { useSiteConfig } from '@/features/site-config/SiteConfigContext';

/** Riga in fondo a ogni pagina: sottile, per non togliere spazio alla mappa. */
export function Footer() {
  const { demoMode } = useSiteConfig().config;
  return (
    <footer className="footer">
      <span>DiscoverEvent · {demoMode ? 'demo, dati azzerati ogni notte' : 'progetto didattico'}</span>
      <Link to="/privacy">Privacy</Link>
    </footer>
  );
}
