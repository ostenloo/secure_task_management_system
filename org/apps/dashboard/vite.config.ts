import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    // Polyfill for crypto.hash if not available
    'crypto.hash': 'undefined',
  },
  optimizeDeps: { 
    disabled: 'build' // Only disable during dev, enable for build
  },
  esbuild: {
    target: 'es2020', // Lower target for better compatibility
  },
  resolve: {
    alias: { 
      crypto: 'node:crypto',
    },
  },
});
