import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemaTypes'
import { esESLocale } from '@sanity/locale-es-es'
import { documentInternationalization } from '@sanity/document-internationalization'
import Logo from './components/Logo'

export default defineConfig({
  name: 'default',
  title: 'cacao & avocado',

  projectId: 'ldpz4q29',
  dataset: 'production',

  // Custom logo
  studio: {
    components: {
      logo: Logo,
    },
  },

  plugins: [
    structureTool({ structure: (await import('./structure')).default }),
    documentInternationalization({
      // Required configuration
      supportedLanguages: [
        { id: 'es', title: 'Español' },
        { id: 'en', title: 'English' },
      ],
      schemaTypes: ['project'],
      languageField: 'language',
      weakReferences: true,
      apiVersion: '2025-02-19',
    }),
    esESLocale(),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },
})
