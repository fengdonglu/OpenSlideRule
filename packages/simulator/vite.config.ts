import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths so the built site works from any sub-path (GitHub Pages).
  base: './',
  plugins: [vue()],
  server: {
    port: 3000,
    open: true,
  },
})
