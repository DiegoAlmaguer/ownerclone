import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/v1': { target: process.env.VITE_API || 'http://localhost:8080', changeOrigin: true },
      '/ws': { target: process.env.VITE_API || 'http://localhost:8080', ws: true, changeOrigin: true }
    }
  }
});
