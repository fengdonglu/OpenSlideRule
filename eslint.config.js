import pluginVue from 'eslint-plugin-vue'
import { withVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import prettier from '@vue/eslint-config-prettier'

export default withVueTs(
  {
    name: 'app/files-to-ignore',
    ignores: [
      'dist/**',
      'packages/**/dist/**',
      'node_modules/**',
      'coverage/**',
      'Bak/**',
      'tools/**',
    ],
  },
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  prettier,
)
