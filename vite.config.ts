import { defineConfig } from 'vite';

export default defineConfig({
  root: 'playground',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
  },
});
