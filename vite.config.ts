import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/2026-05-24-island-forge/',
  build: { outDir: 'out', emptyOutDir: true },
  server: {
    proxy: {
      '/api': 'http://localhost:3486',
    },
  },
});
