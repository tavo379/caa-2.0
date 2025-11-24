import { defineField, defineType } from 'sanity'

export const configurationType = defineType({
    name: 'configuration',
    title: 'Configuración',
    type: 'document',
    fields: [
        defineField({
            name: 'title',
            title: 'Título del Sitio',
            type: 'string',
        }),
        defineField({
            name: 'logo',
            title: 'Logo',
            type: 'image',
            options: {
                hotspot: true,
            },
        }),
        defineField({
            name: 'seoTitle',
            title: 'Título SEO por defecto',
            type: 'string',
        }),
        defineField({
            name: 'seoDescription',
            title: 'Descripción SEO por defecto',
            type: 'text',
        }),
    ],
})
