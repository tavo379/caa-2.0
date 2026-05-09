# Bulk import de proyectos al portafolio

Guía operativa para añadir, actualizar o re-importar proyectos al sitio
público. Diseñada para que puedas volver en 6 meses sin recordar nada y
seguirla paso a paso.

> **Stack involucrado:** Astro (sitio público) + Sanity v4 (CMS) + Playwright
> (screenshots automáticos) + scripts en `apps/studio/scripts/`.

---

## TL;DR

```bash
# 1. Editas o agregas filas en el CSV
code apps/studio/scripts/projects.csv

# 2. Generas covers (screenshots o fallback tipográfico)
cd apps/studio
npm run capture-covers

# 3. Subes todo a Sanity (idempotente, puedes correrlo N veces)
npm run import-projects

# 4. Disparas un rebuild en Vercel (push cualquier cosa a main, o usa
#    un deploy hook si lo configuraste)
git commit --allow-empty -m "chore: trigger rebuild for new projects" && git push
```

---

## Cuándo usar este flujo

- **Añadir un proyecto nuevo:** agrega una fila al CSV, corre los 2 scripts.
- **Actualizar un proyecto existente:** edita la fila en el CSV, corre los 2
  scripts. Como el `_id` es determinístico (`project-{slug}-{lang}`), el
  documento se sobrescribe en lugar de duplicarse.
- **Refrescar una cover:** elimina el archivo `apps/studio/scripts/covers/{slug}.jpg`
  o desuploadeala desde el script (ver "Forzar re-upload de cover").
- **Edición fina de contenido:** NO uses el script. Ve a Sanity Studio
  (`npm run dev` en `apps/studio`) y edita directamente. El script es
  para cargas masivas o re-importes — el Studio es para pulir.

## Cuándo NO usar este flujo

- Para editar campos que el CSV no tiene (año, stack, métricas, role).
  Esos se editan en Sanity Studio directamente.
- Para borrar proyectos. Bórralos en Sanity Studio.

---

## El CSV (`apps/studio/scripts/projects.csv`)

Una fila por proyecto. **No elimines columnas** — el script las lee por
nombre. Si necesitas dejar algo vacío, déjalo en blanco entre comas.

| Columna | Descripción | Ejemplo |
|---|---|---|
| `slug` | URL slug, kebab-case. **Estable** — si cambia, cambia la URL pública. | `majhacollective` |
| `client` | Nombre legible del cliente. | `Majha Collective` |
| `category` | Una de: `e-commerce`, `architecture`, `creative-agency`, `real-estate`, `health-wellness`, `web-development`. Determina la paleta del fallback cover. | `e-commerce` |
| `site_url` | URL pública del sitio live. Vacío si no hay. | `https://majhacollective.com/` |
| `excerpt_es` / `excerpt_en` | 1 frase para card y meta description. | `Mobiliario artesanal colombiano...` |
| `description_es` / `description_en` | 2-4 frases para el cuerpo del proyecto. Soporta saltos de párrafo con `\n\n`. | `"Majha Collective ofrece...\n\nConstruimos su tienda..."` |

### Formato CSV — gotchas

- Comillas dobles `"..."` para textos que contengan comas, apóstrofes o saltos de línea.
- **Apóstrofes en texto en inglés** (ej. `the brand's`): siempre dentro de comillas dobles para evitar errores del parser.
- Saltos de párrafo en `description_*`: usa `\n\n` literal dentro de la celda entre comillas.

---

## Script 1 — `capture-covers.ts`

Toma screenshots a 1280×800 (deviceScaleFactor 2, so output ~2560×1600)
de cada `site_url`. Cascada de fallbacks cuando el sitio bloquea al bot:

1. **Playwright + Chrome del sistema** (canal `chrome`, no el chromium
   bundled — sortea bot detection casual). Fallback automático a
   `chromium` bundled si Chrome no está instalado.
2. Si el sitio devuelve **4xx/5xx**, llama a la API gratuita de
   **Microlink** (`api.microlink.io`) que renderiza con Chrome real
   desde IPs rotativas — pasa los WAFs estrictos. Free tier: 50 req/día,
   sin API key.
3. Si Microlink también falla, genera un **fallback tipográfico** con la
   paleta de la categoría.

### Cómo se ven los fallbacks tipográficos

```
[fondo cacao oscuro]
   CACAO & AVOCADO · PROJECT          ← top label
   Studio L'marc                      ← nombre grande, font-weight 300
   ┌────────────┐
   │ ARCHITECTURE │  cacaoandavocado.co  ← pill + signature
   └────────────┘
```

Las paletas viven en `capture-covers.ts` en la constante `PALETTES`. Si
quieres cambiar el look de una categoría, edita ahí.

### Sitios que requieren la API externa (bot-bloqueados)

Al 2026-05-09 estos 4 sitios devuelven 403 a Playwright incluso con
Chrome real + stealth init scripts, y son rescatados por el fallback
de Microlink:
- `studiolamarc.com`
- `ververafine.com`
- `mapandpartners.com`
- `backbonebw.com`

**No es problema del script** — es bot detection del WAF/hosting. Si
algún día Microlink también empieza a fallar (rate limit excedido o el
sitio cambia de WAF más estricto), el typographic fallback se activa.

### Output

- `apps/studio/scripts/covers/{slug}.jpg` (uno por fila)
- `apps/studio/scripts/covers/manifest.json` (booleano por slug, útil para debug)

`covers/` está en `.gitignore` — los archivos no se commitean (binarios pesados regenerables).

---

## Script 2 — `import-projects.ts`

Lee el CSV + las covers del filesystem y crea/actualiza en Sanity:

Por cada fila:
1. **Sube la cover** a Sanity Assets (si no existe ya en el doc).
2. **Crea/reemplaza el documento ES** con `_id = project-{slug}-es`.
3. **Crea/reemplaza el documento EN** con `_id = project-{slug}-en`.
4. **Crea/reemplaza el `translation.metadata`** con `_id = translation-{slug}` que liga ambos.

Todo en una `client.transaction()` por proyecto — atómico (si algo falla, no queda nada a medias para esa fila).

### Idempotencia

- `_id`s son determinísticos → re-correr el script **sobrescribe**, no duplica.
- Si el doc ya tiene `cover.asset._ref`, el script **reusa** ese asset y NO re-sube. Esto evita inflar el storage.
- Para forzar re-upload de cover: ver siguiente sección.

### Forzar re-upload de cover (cuando refrescas el screenshot)

```bash
# 1. Re-genera covers
npm run capture-covers

# 2. Borra la ref de cover en los docs afectados
cd apps/studio
node --experimental-strip-types --no-warnings -e "
import('@sanity/client').then(async ({createClient}) => {
  const dotenv = await import('dotenv')
  dotenv.config({path: './.env'})
  const client = createClient({
    projectId: 'ldpz4q29',
    dataset: 'production',
    apiVersion: '2025-02-19',
    token: process.env.SANITY_WRITE_TOKEN,
    useCdn: false,
  })
  const slugs = ['majhacollective', 'pongstudio']  // ← edita esta lista
  const ids = slugs.flatMap(s => ['project-' + s + '-es', 'project-' + s + '-en'])
  const tx = client.transaction()
  for (const id of ids) tx.patch(id, {unset: ['cover']})
  await tx.commit()
  console.log('Unset cover for ' + ids.length + ' docs')
})
"

# 3. Re-corre el import (subirá las covers nuevas)
npm run import-projects
```

---

## Token de Sanity

El script necesita `SANITY_WRITE_TOKEN` en `apps/studio/.env`. El archivo
ya está gitignored (regla `.env` en el `.gitignore` raíz).

### Crear o rotar el token

1. https://www.sanity.io/manage/project/ldpz4q29 → tab **API**
2. Sección **Tokens** → **Add API token**
3. Name: lo que prefieras (ej. `bulk-import`). Permissions: **Editor**.
4. Copia el token (solo se muestra una vez).
5. Pega en `apps/studio/.env`:
   ```
   SANITY_WRITE_TOKEN=skXXXXXX...
   ```

Si el token se compromete (apareció en logs, screenshot, etc.), **revócalo
en sanity.io/manage** y crea uno nuevo.

---

## Triggering el rebuild en Vercel

El sitio es `output: 'static'` en Astro — las páginas se generan en build
time, no en runtime. Por lo tanto **cualquier cambio en Sanity NO aparece
en producción hasta que Vercel rebuilde**.

### Opción A — push a main (lo que hacemos hoy)

```bash
git commit --allow-empty -m "chore: trigger rebuild for content update"
git push
```

### Opción B — Vercel Deploy Hook (recomendado para uso frecuente)

1. En Vercel project settings → **Git** → **Deploy Hooks** → crea uno (ej. `sanity-content-update`, branch `main`).
2. Copia la URL.
3. Trigger manual: `curl -X POST https://api.vercel.com/v1/integrations/deploy/...`
4. **O** configura un webhook en Sanity (`sanity.io/manage` → API → Webhooks) que dispare ese URL automáticamente cuando se publique cualquier doc del tipo `project`.

La opción B es lo correcto para producción a largo plazo. La A es suficiente
mientras los imports son ad-hoc.

---

## Troubleshooting

### `npm run capture-covers` falla en algún sitio

El script tiene fallback automático para 4xx/5xx → genera cover tipográfica.
Si quieres entender por qué falla:

```bash
# Edita capture-covers.ts y cambia headless: true a headless: false
# Esto abre la ventana del navegador para que veas qué pasa
```

### "Project not found: {slug}" durante el build de Astro

Significa que `getStaticPaths` listó un slug que después no encontró en el
fetch de detalle. Causas comunes:
- Borraste el doc en Sanity entre dos fetches (race condition rara).
- El doc existe pero le falta el `slug.current` o `language`.

Verifica en Sanity Studio que el doc tenga `language: 'es'` o `'en'` y un slug válido.

### Asset hash idéntico para 2 proyectos distintos

Sanity dedupea assets por **hash del contenido**. Si dos proyectos terminan
con el mismo `image-XXXX-...` significa que **las imágenes son binariamente
idénticas** — típicamente porque ambos sitios devolvieron la misma página
de error 403 que se capturó antes de que existiera el fallback. Solución:
ver "Forzar re-upload de cover".

### Ya tengo proyectos en Sanity con `_id` aleatorios (creados a mano)

El script crea `_id`s determinísticos como `project-{slug}-es`. Si ya
existe un doc del mismo proyecto con `_id` random, ambos coexistirán y
verás duplicados en el sitio. Solución: borrar el doc viejo:

```bash
cd apps/studio
node --experimental-strip-types --no-warnings -e "
import('@sanity/client').then(async ({createClient}) => {
  const dotenv = await import('dotenv')
  dotenv.config({path: './.env'})
  const client = createClient({
    projectId: 'ldpz4q29', dataset: 'production', apiVersion: '2025-02-19',
    token: process.env.SANITY_WRITE_TOKEN, useCdn: false,
  })
  const docs = await client.fetch('*[_type==\"project\" && slug.current match \"<slug>*\"]{_id}')
  const meta = await client.fetch('*[_type==\"translation.metadata\" && references(\$ids)]{_id}', {ids: docs.map(d => d._id)})
  const tx = client.transaction()
  for (const d of [...docs, ...meta]) tx.delete(d._id)
  await tx.commit()
  console.log('Deleted', [...docs, ...meta].length, 'docs')
})
"
```

---

## Archivos involucrados

| Archivo | Rol |
|---|---|
| `apps/studio/scripts/projects.csv` | Fuente de verdad — qué proyectos existen y sus textos |
| `apps/studio/scripts/capture-covers.ts` | Genera screenshots/fallbacks |
| `apps/studio/scripts/import-projects.ts` | Sube todo a Sanity |
| `apps/studio/scripts/covers/` | Output de screenshots (gitignored) |
| `apps/studio/.env` | Token de write (gitignored) |
| `apps/studio/schemaTypes/projectType.ts` | Schema de Sanity — define qué campos puede tener un proyecto |
| `apps/web/src/lib/sanity/queries.ts` | Queries GROQ que consume el sitio |

---

## Próximas mejoras pendientes

(Ver `ROADMAP.md` para la lista completa.)

- `@sanity/image-url` para covers responsive/WebP en lugar de tamaño original.
- Webhook Sanity → Vercel deploy hook para rebuild automático.
- Editar año/stack/role/outcome de cada proyecto en el Studio.
