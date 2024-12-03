import { defineConfig } from 'vite';

export default defineConfig({
  root: './public', // Use the public folder as the root
  server: {
    port: 5173, // Vite development server port
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Backend server
        changeOrigin: true, // Adjust the origin of the host header to match the target
        secure: false, // Allow connections to insecure backend (if needed)
      },
    },
  },
  build: {
    outDir: '../dist', // Output directory for built files
    emptyOutDir: true, // Remove existing files in outDir before building
    rollupOptions: {
      input: './public/index.html', // Ensure the correct input file is used
    },
  },
});