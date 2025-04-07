/**
 * Resources & configs
 */
import i18n from 'i18next'
import ResourcesToBackend from 'i18next-resources-to-backend'
import yaml from 'js-yaml'
import { initReactI18next } from 'react-i18next'

/**
 * Methods
 */
const loadYaml = (lng: string, ns: string) => {
  const key = `/src/locales/${lng}/${ns}.yml`
  const modules: Record<string, string> = import.meta.glob('/src/locales/**/*.yml', {
    eager: true,
    query: '?raw',
    import: 'default'
  })

  if (modules[key]) return yaml.load(modules[key])
  else throw new Error(`Namespace ${ns} not found for language ${lng}`)
}

/**
 * Declaration
 */
i18n
  .use(ResourcesToBackend((lng: string, ns: string) => loadYaml(lng, ns)))
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: false,
    interpolation: { escapeValue: false },
    ns: ['common', 'nav', 'auth', 'page-errors', 'page-dashboard'],
    defaultNS: 'common'
  })

export default i18n
