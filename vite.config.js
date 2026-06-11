import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) {
            if (id.includes('addons/postprocessing')) return 'vendor-three-postprocessing';
            if (id.includes('addons/loaders')) return 'vendor-three-loaders';
            if (id.includes('addons/controls')) return 'vendor-three-controls';
            return 'vendor-three';
          }

          if (id.includes('node_modules/gsap')) return 'vendor-gsap';
        },
      },
    },
  },
});
