import { Link } from 'react-router-dom';

/** Riga in fondo a ogni pagina: sottile, per non togliere spazio alla mappa. */
export function Footer() {
  return (
    <footer className="footer">
      <span>DiscoverEvent · progetto didattico</span>
      <Link to="/privacy">Privacy</Link>
    </footer>
  );
}
