import type { StructureResolver } from 'sanity/structure'
import { ProjectsIcon, EarthGlobeIcon } from '@sanity/icons'

const LANGS = [
  { id: 'es', title: 'Español' },
  { id: 'en', title: 'English' },
]

const structure: StructureResolver = (S) => {
  const translationMeta =
    S.documentTypeListItem('translation.metadata').title('Translation metadata')

  const proyectos = S.listItem()
    .title('Proyectos')
    .icon(ProjectsIcon)
    .child(
      S.list()
        .title('Proyectos')
        .items([
          ...LANGS.map((l) =>
            S.listItem()
              .title(`Proyectos (${l.id.toUpperCase()})`)
              .icon(ProjectsIcon)
              .child(
                S.documentTypeList('project')
                  .title(`Proyectos (${l.title})`)
                  .filter('_type == "project" && language == $lang')
                  .params({ lang: l.id }),
              ),
          ),
          S.divider(),
          S.listItem()
            .title('Todos los proyectos')
            .icon(ProjectsIcon)
            .child(S.documentTypeList('project').title('Todos los proyectos')),
        ]),
    )

  const configuration = S.listItem()
    .title('Configuración')
    .icon(EarthGlobeIcon)
    .child(S.document().schemaType('configuration').documentId('configuration'))

  const rest = S.documentTypeListItems().filter(
    (li) => !['project', 'translation.metadata', 'configuration'].includes(li.getId() || ''),
  )

  return S.list()
    .title('Contenido')
    .items([configuration, translationMeta, proyectos, ...rest])
}

export default structure
