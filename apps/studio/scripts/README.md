# Studio scripts

Helpers para mantener Sanity Studio (bulk import, capturas, etc.).

> **Para el flujo completo paso a paso** (cómo añadir un proyecto nuevo,
> troubleshooting, gotchas de Sanity, cómo crear/rotar el token, etc.) ver
> [`docs/guides/bulk-import-projects.md`](../../../docs/guides/bulk-import-projects.md).

## projects.csv

Fuente de verdad para el bulk import de proyectos. Una fila por proyecto.

### Columnas

| Columna | Descripción |
|---|---|
| `slug` | Identificador URL (kebab-case). Estable: si cambia, cambia la URL pública. |
| `client` | Nombre legible del cliente. |
| `category` | `e-commerce` / `architecture` / `creative-agency` / `real-estate` / `health-wellness` / `web-development`. |
| `site_url` | URL pública si está vivo. Vacío si no. |
| `excerpt_es` / `excerpt_en` | 1 frase para card y meta description. |
| `description_es` / `description_en` | 2-4 frases para el cuerpo del proyecto. |

Año, stack, rol específico y métricas de resultado se editan directamente en
Sanity Studio después del import. Mantenemos el CSV mínimo para shipear el
portafolio rápido.

## Próximos scripts (Sprint 2)

- `capture-covers.ts` — toma screenshots de cada `site_url` con Playwright.
- `import-projects.ts` — lee el CSV + las covers y crea ES + EN + translation.metadata
  en Sanity, idempotente vía `_id = project-${slug}` + `createOrReplace`.
