import { defineConfig } from 'vite'

// SSR build: bundles src/bin.ts and its (browser-safe) @slide-rule/core
// dependency into a single ESM dist/bin.js, leaving Node builtins external.
export default defineConfig({
  build: {
    ssr: 'src/bin.ts',
    outDir: 'dist',
    emptyOutDir: true,
    target: 'node20',
    rollupOptions: { output: { entryFileNames: 'bin.js', format: 'es' } },
  },
})
