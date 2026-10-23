import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // "@/lib/api" invece di "../../lib/api": gli import non si rompono se un file cambia cartella.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // In sviluppo le chiamate /api vanno al server Express: niente problemi di CORS.
    proxy: { '/api': `http://localhost:${process.env.API_PORT ?? 3001}` },
  },
});
