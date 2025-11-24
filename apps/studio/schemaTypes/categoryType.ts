import { defineType, defineField } from 'sanity'

export const categoryType = defineType({
  name: 'category',
  title: 'Categoría',
  type: 'document',
  groups: [
    { name: 'content', title: 'Contenido', default: true },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Título',
      type: 'string',
      validation: (r) => r.required().min(2).max(60),
      group: 'content',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
        isUnique: (value, context) => context.defaultIsUnique(value, context),
      },
      validation: (r) => r.required(),
      group: 'content',
    }),
    defineField({
      name: 'description',
      title: 'Descripción',
      type: 'text',
      rows: 3,
      validation: (r) => r.max(200),
      group: 'content',
    }),
    // Reusable minimal SEO for list pages
    defineField({
      name: 'metaTitle',
      title: 'Meta title',
      type: 'string',
      validation: (r) => r.max(70),
      group: 'seo',
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      validation: (r) => r.max(160),
      group: 'seo',
    }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'slug.current' },
    prepare({ title, subtitle }) {
      return { title: title || 'Categoría sin título', subtitle: subtitle || '' }
    },
  },
})
