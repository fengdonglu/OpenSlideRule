import { defineConfig, configDefaults } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// Compile .vue files for the component tests. Vitest's default include/exclude
// and per-file environment docblocks are kept; the Playwright specs are excluded.
export default defineConfig({
  plugins: [vue()],
  test: { exclude: [...configDefaults.exclude, 'e2e/**'] },
})
