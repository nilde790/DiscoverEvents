import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In sviluppo le chiamate /api vanno al server Express: niente problemi di CORS.
    proxy: { '/api': `http://localhost:${process.env.API_PORT ?? 3001}` },
  },
});
