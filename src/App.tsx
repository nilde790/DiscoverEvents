import type { ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Header } from './components/Header';
import { RequireAuth } from './components/RequireAuth';
import { useApp } from './context/AppContext';
import { AdminPage } from './pages/AdminPage';
import { CatalogPage } from './pages/CatalogPage';
import { EventFormPage } from './pages/EventFormPage';
import { EventPage } from './pages/EventPage';
import { ExplorePage } from './pages/ExplorePage';
import { LoginPage } from './pages/LoginPage';
import { MyEventsPage } from './pages/MyEventsPage';
import { OrganizerPage } from './pages/OrganizerPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';

const authed = (page: ReactNode) => <RequireAuth>{page}</RequireAuth>;

export default function App() {
  const { toast } = useApp();

  return (
    <div className="app">
      <Header />
      <main className="main">
        <Routes>
          {/* Pagine pubbliche: gli eventi si possono esplorare anche senza account. */}
          <Route path="/" element={<ExplorePage />} />
          <Route path="/catalogo" element={<CatalogPage />} />
          <Route path="/eventi/:id" element={<EventPage />} />
          <Route path="/accedi" element={<LoginPage />} />
          <Route path="/registrati" element={<RegisterPage />} />

          {/* Pagine che richiedono l'accesso. */}
          <Route path="/profilo" element={authed(<ProfilePage />)} />
          <Route path="/miei-eventi" element={authed(<MyEventsPage />)} />
          <Route path="/organizzatore" element={authed(<OrganizerPage />)} />
          <Route path="/organizzatore/nuovo" element={authed(<EventFormPage />)} />
          <Route path="/organizzatore/eventi/:id/modifica" element={authed(<EventFormPage />)} />
          <Route path="/admin" element={authed(<AdminPage />)} />

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
