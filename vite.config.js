import { defineConfig } from 'vite';

export default defineConfig({
  root: './public', // Set public as the root for frontend
  server: {
    port: 3000, // Port for development
  },
  build: {
    outDir: '../dist', // Output built files to ../dist
    emptyOutDir: true,  // Clear the output directory before building
  },
});