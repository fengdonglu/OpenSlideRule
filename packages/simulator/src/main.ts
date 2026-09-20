import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { i18n, applyInitialLocale } from './i18n'
import './style.css'

applyInitialLocale()

createApp(App).use(createPinia()).use(i18n).mount('#app')
