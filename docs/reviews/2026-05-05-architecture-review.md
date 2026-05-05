# Architecture Review — 2026-05-05

> Snapshot de la arquitectura del repo en la fecha indicada. Documento histórico — no editar después de creado. Para tareas accionables ver [`ROADMAP.md`](../../ROADMAP.md).

**Stack real:** Astro 5 (SSG) + Sanity v4 + Turborepo + npm workspaces.

---

## Resumen ejecutivo

El sitio público es **Astro 5 estático** consumiendo **Sanity v4** vía `@sanity/astro`. Turborepo con tres apps adicionales: `studio` (Sanity), `invoices` (Next.js + Supabase, sin relación al sitio) y `docs` (scaffolding sin tocar de `create-turbo`).

Lo bueno: stack coherente, design system bien tokenizado, schemas de Sanity con profundidad (i18n con `documentInternationalization`, SEO completo, hotspot en imágenes).
Lo malo: bugs activos en producción, código muerto que estorba, y patrones repetidos que harán doloroso el bulk import si no se atacan primero.

---

## Mapa actual del repo

```
cacao-and-avocado/
├── astro.config.mjs               ⚠️ archivo huérfano en raíz
├── apps/
│   ├── web/         Astro 5 + Sanity client    ← sitio público
│   ├── studio/      Sanity 4 (projectId ldpz4q29, dataset production)
│   ├── invoices/    Next.js 16 + Supabase + Resend (sistema interno)
│   └── docs/        ⚠️ template create-turbo intacto
├── packages/
│   ├── ui/          ⚠️ button/card/code básicos, solo consumidos por docs
│   ├── eslint-config/
│   └── typescript-config/
└── turbo.json
```

---

## 1. Estructura del monorepo

### ✅ Bien hecho
- Turborepo + npm workspaces correctamente configurados.
- `turbo.json` declara env vars del build (`SANITY_PROJECT_ID`, etc.) — invalida cache automáticamente cuando cambian.
- Cada app tiene `vercel.json` con `installCommand: cd ../.. && npm install` para deploys independientes.

### ⚠️ Áreas de mejora
- **Alta** — `apps/docs` y `packages/ui` son scaffolding de `create-turbo` sin uso real. Borrar.
- **Alta** — `astro.config.mjs` en la raíz del monorepo es huérfano (Astro nunca corre desde ahí). Borrar.
- **Media** — `apps/invoices` no comparte código con `apps/web`. Justificable por comodidad de despliegue, pero hoy no comparten nada.
- **Baja** — Hay dos eslint-configs (`packages/eslint-config` para Next, `apps/studio/eslint.config.mjs`). `apps/web` no tiene lint configurado.

---

## 2. App web (Astro)

### ✅ Bien hecho
- `output: "static"` con prerendering vía `getStaticPaths` — correcto para sitio de marketing.
- Design system real con tokens CSS (`apps/web/src/styles/theme.css:5-110`) y página viva en `/ds`.
- Páginas con redirect cuando el slug cambia de idioma (ej. `/es/about.astro:3` → 301 a `/es/nosotros`).
- Layout único (`Layout.astro`) recibe `lang` y lo pasa a Header/Footer.

### 🔴 Bugs activos (Alta prioridad)

**Bug 1 — Orden de proyectos roto**
En `apps/web/src/components/ProjectsHome.astro:19`, `apps/web/src/pages/es/proyectos/index.astro:11` y `apps/web/src/pages/en/projects/index.astro:11`:

```groq
order(system.publishedAt desc)
```

El schema (`apps/studio/schemaTypes/projectType.ts:60-65`) define `publishedAt` en la **raíz**. Lo único en `system` es `createdAt`/`updatedAt`. Hoy estás ordenando por `null` → orden indefinido. Debe ser `order(publishedAt desc)`.

**Bug 2 — Redirect a 404 inexistente**
`[slug].astro:34` (ambos `es` y `en`):
```js
return Astro.redirect("/404");
```
Con `output: "static"` esto genera 302 → `/404` que devuelve otro 404. Crear `apps/web/src/pages/404.astro` o eliminar el branch (es código muerto: `getStaticPaths` ya garantiza el slug).

**Bug 3 — Toggle de idioma pierde la ruta**
`apps/web/src/components/Header.astro:47-49`:
```html
<a href="/es" class={...}>ES</a>
<a href="/en" class={...}>EN</a>
```
Si estás en `/es/proyectos/foo`, clic en EN te lleva a `/en` (home). Mata UX y SEO. Usar `Astro.url.pathname` con un helper de mapeo.

### ⚠️ Patrones repetidos (Media prioridad)

**Duplicación de queries GROQ.** La misma query se repite en:
- `apps/web/src/components/ProjectsHome.astro:18-28`
- `apps/web/src/pages/es/proyectos/index.astro:9-20`
- `apps/web/src/pages/en/projects/index.astro:9-20`
- `apps/web/src/pages/es/proyectos/[slug].astro:18-31`
- `apps/web/src/pages/en/projects/[slug].astro:18-31`

Mover a `apps/web/src/lib/sanity/queries.ts` con funciones tipadas.

**Duplicación de paths localizados.** El patrón `lang === "en" ? "contact" : "contacto"` aparece en `Header.astro` (5x), `Footer.astro` (5x), `Hero.astro:24`, `AboutHome.astro:19`, `ContactHome.astro:18`, `Services.astro:26`, `ProjectsHome.astro:64,84`. Total: ~20 sitios.

**Componente Button no se usa.** `apps/web/src/components/Button.astro` está bien diseñado pero cero importaciones. Cada CTA reescribe el markup manualmente — esto causó el commit `42b5e82 fix: add ArrowRight icons to all broken buttons`.

**Imágenes sin optimizar.** Todos los `cover.asset->url` (`[slug].astro:65`, cards de index, `ProjectsHome.astro`) sirven la imagen completa desde el CDN de Sanity sin resize ni responsive ni formato moderno.

**Sin tipos generados.** Todo es `(project: any)`. Sanity v4 incluye `sanity typegen`.

### ⚠️ Otros (Baja prioridad)

- `apps/studio/schemaTypes/language.ts` define `languageField` y `languages[]` que no se exporta. Código muerto.
- `Hero.astro:30` usa `set:html={title}` — frágil pero aceptable como TODO.
- `astro.config.mjs:21` no usa `i18n` config nativo de Astro 5. Hoy `pages/index.astro` hace `<meta http-equiv="refresh">` para llevar a `/es/`.

---

## 3. Sanity Studio

### ✅ Bien hecho
- Schema `project` muy completo con groups (`content`, `media`, `nav`, `seo`, `meta`), validaciones de longitud, `slugify` custom que normaliza acentos (`projectType.ts:36-44`), referencias a categorías filtradas por idioma (`projectType.ts:147-152`).
- Internationalization plugin con `weakReferences: true`.
- Estructura custom (`structure.ts`) con vistas separadas por idioma + "Todos los proyectos".
- Slug se vuelve `readOnly` después de publicar (`projectType.ts:53`).

### ⚠️ Áreas de mejora
- **Media** — `categoryType.ts` no tiene `language` field, pero `projectType.ts:124-129` filtra por idioma. Las categorías son globales pero sus textos (`title`, `description`) no son localizados.
- **Media** — `relatedProjects` filtra por `language == document.language` solo en `options.filter` del picker. Sin validación de integridad si se edita por API/import.
- **Baja** — `configurationType.ts` se presenta como singleton en `structure.ts:39-42` pero el schema permite múltiples instancias.
- **Baja** — `system.createdAt`/`updatedAt` (`projectType.ts:200-209`) no se actualiza automáticamente. Hoy no se usa para nada.

---

## 4. Performance

1. **Imágenes (Alta)** — `@sanity/astro` expone `getImage()` y se puede instalar `@sanity/image-url`. Hoy todas las imágenes se sirven a tamaño original. **Prioridad #1** dado el bulk import inminente.

2. **Fonts (Media)** — `Layout.astro:23-28` carga Space Grotesk + Inter desde Google Fonts con todos los pesos. Sin `font-display: swap` explícito, sin precarga. Astro 5.7+ tiene `<Font>` nativo que self-hostea y subset-ea.

3. **Carousel (OK)** — `TechStack.astro:97-180` ya pasó por refactor reciente. Solución actual con `getBoundingClientRect` y CSS `mask-image` está bien.

---

## 5. Bulk import a Sanity — diagnóstico

La estructura actual **dificulta** el bulk import por:
1. No hay `scripts/` ni `lib/sanity/` en `apps/studio` — no hay dónde colocar un script idiomático.
2. El schema requiere `cover` con `alt` (`projectType.ts:105-107`) y `documentInternationalization` con weak references — el import debe crear ES + EN + el `translation.metadata` doc.
3. Sin tipos generados — script en TS sin tipos es propenso a errores silenciosos.

### Recomendación

Antes de importar, en este orden:

1. **Generar tipos** desde el Studio:
   ```bash
   cd apps/studio
   npx sanity schema extract
   npx sanity typegen generate
   ```

2. **Crear script** en `apps/studio/scripts/import-projects.ts`:
   - `@sanity/client` con token de write nuevo (Editor o Maintainer en sanity.io/manage).
   - Lee CSV/JSON local con: `title_es, title_en, slug, tech, links, body_es, body_en, cover_path`.
   - Sube imágenes con `client.assets.upload('image', fs.createReadStream(path))`.
   - Crea doc ES + doc EN + `translation.metadata` (shape: `{translations: [{_key, value: ref}, …]}`).
   - Usa `client.transaction()` para atomicidad por proyecto.
   - **Idempotente**: `_id` determinístico (`project-${slug}`) + `createOrReplace` en lugar de `create`.

3. **Crear `apps/web/src/lib/sanity/queries.ts` antes** del import. Después no querrás tocar 5 archivos cuando descubras un campo faltante.

### Imágenes (otro pendiente)
- Si los proyectos tienen URL viva: screenshots con Playwright a 1200×630.
- Si son trabajos antiguos: combinar logo + screenshot + paleta.
- **Estandarizar a 1200×630** y dejar que `@sanity/image-url` haga responsive en runtime.

---

## Riesgos

- ⚠️ Bulk import sin resolver el bug del orden → proyectos en orden aleatorio en producción.
- ⚠️ Bulk import sin `@sanity/image-url` → primeras visitas lentas y caras de CDN.
- ⚠️ Script de import no idempotente → borrar manualmente para iterar.
