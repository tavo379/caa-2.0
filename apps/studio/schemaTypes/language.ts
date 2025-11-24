import {defineType, defineField} from 'sanity'

export const languages = [
  {id: 'es', title: 'Español', isDefault: true},
  {id: 'en', title: 'English'},
]

export const languageField = defineField({
  name: 'language',
  title: 'Idioma',
  type: 'string',
  options: {list: languages.map((l) => ({title: l.title, value: l.id})), layout: 'radio'},
  initialValue: 'es',
  validation: (r) => r.required(),
  group: 'content',
})
