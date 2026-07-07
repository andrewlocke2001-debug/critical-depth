import { defineConfig } from 'vite';

export default defineConfig({
  // relative base so the build works when hosted under a subpath
  // (e.g. https://<user>.github.io/critical-depth/)
  base: './',
  build: {
    outDir: 'docs', // GitHub Pages serves main branch /docs
    chunkSizeWarningLimit: 1600,
  },
});
