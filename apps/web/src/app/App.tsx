import type { ReactNode } from 'react';
import { Route, Routes } from 'react-router';
import { BottomNav } from '@/components/layout/BottomNav';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { AdminPage } from '@/features/admin/AdminPage';
import { CatalogPage } from '@/features/events/CatalogPage';
import { EventFormPage } from '@/features/organizer/EventFormPage';
import { EventPage } from '@/features/events/EventPage';
import { ExplorePage } from '@/features/events/ExplorePage';
import { LoginPage } from '@/features/auth/LoginPage';
import { MyEventsPage } from '@/features/events/MyEventsPage';
import { OrganizerPage } from '@/features/organizer/OrganizerPage';
import { PrivacyPage } from '@/features/legal/PrivacyPage';
import { ProfilePage } from '@/features/auth/ProfilePage';
import { RegisterPage } from '@/features/auth/RegisterPage';

const authed = (page: ReactNode) => <RequireAuth>{page}</RequireAuth>;

/** Rotte dell'app: quali pagine sono pubbliche e quali richiedono l'accesso. */
export default function App() {
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
          <Route path="/privacy" element={<PrivacyPage />} />

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
      <Footer />
      <BottomNav />
    </div>
  );
}
