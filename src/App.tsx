import { Route, Routes } from 'react-router-dom';
import { Header } from './components/Header';
import { useApp } from './context/AppContext';
import { CatalogPage } from './pages/CatalogPage';
import { EventFormPage } from './pages/EventFormPage';
import { EventPage } from './pages/EventPage';
import { ExplorePage } from './pages/ExplorePage';
import { MyEventsPage } from './pages/MyEventsPage';
import { OrganizerPage } from './pages/OrganizerPage';

export default function App() {
  const { toast, error, currentUser } = useApp();

  // Senza utenti il server non risponde: inutile mostrare pagine vuote.
  if (!currentUser) {
    return <div className="splash">{error ?? 'Avvio in corso…'}</div>;
  }

  return (
    <div className="app">
      <Header />
      <main className="main">
        <Routes>
          <Route path="/" element={<ExplorePage />} />
          <Route path="/catalogo" element={<CatalogPage />} />
          <Route path="/eventi/:id" element={<EventPage />} />
          <Route path="/miei-eventi" element={<MyEventsPage />} />
          <Route path="/organizzatore" element={<OrganizerPage />} />
          <Route path="/organizzatore/nuovo" element={<EventFormPage />} />
          <Route path="/organizzatore/eventi/:id/modifica" element={<EventFormPage />} />
          <Route path="*" element={<div className="page placeholder">Pagina non trovata.</div>} />
        </Routes>
      </main>
      {toast && (
        <div key={toast.id} className={`toast ${toast.kind}`} role="status">
          {toast.text}
        </div>
      )}
    </div>
  );
}
