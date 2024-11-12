import { defineConfig } from 'vite';

export default defineConfig({
  root: './public', // Public folder as root
  server: {
    port: 3000, // Vite development server port
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Your backend server
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: '../dist', // Build files to ../dist
    emptyOutDir: true,  // Clear outDir before building
  },
});