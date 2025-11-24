import {defineType, defineField} from 'sanity'
import {ProjectsIcon} from '@sanity/icons'

export const projectType = defineType({
  name: 'project',
  title: 'Proyecto',
  type: 'document',
  icon: ProjectsIcon,
  groups: [
    {name: 'content', title: 'Contenido', default: true},
    {name: 'media', title: 'Medios'},
    {name: 'nav', title: 'Navegación'},
    {name: 'seo', title: 'SEO'},
    {name: 'meta', title: 'Metadatos'},
  ],
  fields: [
    defineField({name: 'language', type: 'string', readOnly: true, hidden: true}),

    defineField({
      name: 'title',
      title: 'Título',
      type: 'string',
      validation: (r) => r.required().min(3),
      group: 'content',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'Sólo el segmento de URL (sin barra inicial).',
      options: {
        source: 'title',
        maxLength: 96,
        isUnique: (value, context) => context.defaultIsUnique(value, context),
        slugify: (input: string) =>
          input
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^\-+|\-+$/g, ''),
      },
      validation: (r) =>
        r.required().custom((v) => {
          if (!v?.current) return 'Requerido'
          if (v.current.startsWith('/')) return 'No inicies con “/”'
          if (/\s/.test(v.current)) return 'Sin espacios; usa guiones'
          return true
        }),
      readOnly: ({document}) =>
        !!document?.publishedAt && !String(document?._id || '').startsWith('drafts.'),
      group: 'content',
    }),

    defineField({
      name: 'publishedAt',
      title: 'Fecha de publicación',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (r) => r.required(),
      group: 'content',
    }),
    defineField({
      name: 'excerpt',
      title: 'Resumen (recomendado 150–160 caracteres)',
      type: 'text',
      rows: 3,
      validation: (r) => r.max(260),
      group: 'content',
    }),
    defineField({
      name: 'body',
      title: 'Contenido',
      type: 'array',
      of: [
        {type: 'block'},
        {
          type: 'image',
          options: {hotspot: true},
          fields: [{name: 'alt', title: 'Alt', type: 'string', validation: (r) => r.required()}],
        },
      ],
      group: 'content',
    }),
    defineField({
      name: 'links',
      title: 'Enlaces',
      type: 'object',
      fields: [
        {name: 'siteUrl', title: 'URL del sitio', type: 'url'},
        {name: 'repoUrl', title: 'Repositorio', type: 'url'},
        {name: 'caseStudyUrl', title: 'Case study', type: 'url'},
      ],
      options: {collapsible: true, collapsed: true},
      group: 'content',
    }),
    defineField({
      name: 'cover',
      title: 'Cover (recomendado 1200×630)',
      type: 'image',
      options: {hotspot: true},
      fields: [{name: 'alt', title: 'Alt', type: 'string', validation: (r) => r.required()}],
      validation: (r) => r.required(),
      group: 'media',
    }),
    defineField({
      name: 'gallery',
      title: 'Galería',
      type: 'array',
      of: [
        {
          type: 'image',
          options: {hotspot: true},
          fields: [{name: 'alt', title: 'Alt', type: 'string', validation: (r) => r.required()}],
        },
      ],
      group: 'media',
    }),
    defineField({
      name: 'categories',
      title: 'Categorías',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'category'}]}],
      validation: (r) => r.max(3),
      group: 'nav',
    }),
    defineField({
      name: 'tech',
      title: 'Tecnologías',
      type: 'array',
      of: [{type: 'string'}],
      validation: (r) => r.max(10),
      options: {layout: 'tags'},
      group: 'nav',
    }),
    defineField({
      name: 'relatedProjects',
      title: 'Proyectos relacionados',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [{type: 'project'}],
          options: {
            filter: ({document}) => ({
              filter: 'language == $lang',
              params: {lang: document?.language},
            }),
          },
        },
      ],
      validation: (r) => r.max(6),
      description: 'Sugerencia: mantén el mismo idioma para coherencia y SEO.',
      group: 'nav',
    }),
    defineField({
      name: 'featured',
      title: 'Destacado',
      type: 'boolean',
      initialValue: false,
      group: 'nav',
    }),
    defineField({
      name: 'sortOrder',
      title: 'Orden manual (opcional)',
      type: 'number',
      group: 'nav',
    }),

    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'object',
      options: {collapsible: true, collapsed: false},
      fields: [
        {
          name: 'metaTitle',
          title: 'Meta title (50–60)',
          type: 'string',
          validation: (r) => r.max(70),
        },
        {
          name: 'metaDescription',
          title: 'Meta description (140–160)',
          type: 'text',
          rows: 3,
          validation: (r) => r.max(200),
        },
        {name: 'ogImage', title: 'OG image (1200×630)', type: 'image', options: {hotspot: true}},
        {name: 'canonicalUrl', title: 'Canonical URL', type: 'url'},
        {name: 'noindex', title: 'No index', type: 'boolean', initialValue: false},
      ],
      group: 'seo',
    }),

    defineField({
      name: 'system',
      title: 'Sistema',
      type: 'object',
      options: {collapsible: true, collapsed: true},
      fields: [
        {name: 'createdAt', title: 'Creado', type: 'datetime', readOnly: true},
        {name: 'updatedAt', title: 'Actualizado', type: 'datetime', readOnly: true},
      ],
      group: 'meta',
    }),
  ],

  initialValue: () => ({
    system: {createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()},
  }),

  preview: {
    select: {title: 'title', media: 'cover', publishedAt: 'publishedAt', language: 'language'},
    prepare({title, media, publishedAt, language}) {
      const lang = (language || '').toUpperCase()
      const date = publishedAt ? new Date(publishedAt).toLocaleDateString('es-CO') : ''
      return {
        title: title || 'Proyecto sin título',
        media,
        subtitle: [lang, date].filter(Boolean).join(' - '),
      }
    },
  },
})
