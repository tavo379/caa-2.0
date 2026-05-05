# Roadmap

Tareas accionables vivas. Para el contexto detrás de cada item ver [`docs/reviews/2026-05-05-architecture-review.md`](docs/reviews/2026-05-05-architecture-review.md).

---

## Sprint 0 — Limpieza y bugs (1-2h)

Bajo riesgo, deja todo limpio antes del bulk import.

- [x] Borrar `apps/docs/` (scaffolding create-turbo sin uso).
- [x] Borrar `packages/ui/` (solo lo consume `apps/docs`).
- [x] Borrar `astro.config.mjs` huérfano en la raíz del monorepo.
- [x] Borrar `apps/studio/schemaTypes/language.ts` (no exportado, código muerto).
- [x] **Bug 1** — Fix orden de proyectos: `system.publishedAt` → `publishedAt` en:
  - [x] `apps/web/src/components/ProjectsHome.astro:19`
  - [x] `apps/web/src/pages/es/proyectos/index.astro:11`
  - [x] `apps/web/src/pages/en/projects/index.astro:11`
- [x] **Bug 2** — Fix `Astro.redirect("/404")` en:
  - [x] `apps/web/src/pages/es/proyectos/[slug].astro:34` (cambiado a `throw` claro)
  - [x] `apps/web/src/pages/en/projects/[slug].astro:34`

---

## Sprint 1 — Preparar terreno para bulk import (1d)

Refactors que pagan intereses al hacer el import.

- [x] Crear `apps/web/src/lib/sanity/queries.ts` con queries centralizadas (5 duplicaciones unificadas).
- [x] Crear `apps/web/src/lib/i18n/paths.ts` con `getLocalizedPath(lang, key)` + `switchLangPath`.
- [x] Refactor de los ~20 sitios con `lang === "en" ? "contact" : "contacto"` (Header, Footer, Hero, AboutHome, ContactHome, Services, ProjectsHome, [slug].astro × 2, index.astro × 2).
- [x] Generar tipos Sanity:
  - [x] Script `npm run typegen` agregado a `apps/studio/package.json`.
  - [x] `sanity.types.ts` generado (17 schemas). Tipo `Project` disponible para script de bulk import.
  - [x] Eliminado `(project: any)` en queries y páginas (tipos derivados `ProjectCard` / `ProjectDetail` en `queries.ts`).
- [x] **Bug 3** — Fix toggle ES/EN en `Header.astro` con `switchLangPath(Astro.url.pathname, ...)`.
- [x] Bonus: `sanity.config.ts` migrado de top-level await a import estático (requisito del typegen CLI).

---

## Sprint 2 — Performance + bulk import (2-3d)

- [ ] Instalar `@sanity/image-url` en `apps/web`.
- [ ] Crear helper `apps/web/src/lib/sanity/image.ts` con `urlForImage`.
- [ ] Refactor todas las `<img src={cover.asset->url}>` a responsive (cards, hero, gallery, [slug]).
- [ ] Crear token de write en sanity.io/manage (Editor o Maintainer).
- [ ] Crear `apps/studio/scripts/import-projects.ts`:
  - [ ] Lee CSV/JSON local (campos: title_es, title_en, slug, tech, links, body_es, body_en, cover_path).
  - [ ] Sube imágenes con `client.assets.upload`.
  - [ ] Crea doc ES + doc EN + `translation.metadata`.
  - [ ] `client.transaction()` por proyecto (atomicidad).
  - [ ] Idempotente: `_id` = `project-${slug}` + `createOrReplace`.
- [ ] Estandarizar covers a 1200×630 (Playwright screenshots o composición manual).
- [ ] Migrar fonts a `astro:assets` con `<Font>` nativo de Astro 5.7+.

---

## Sprint 3 — Opcional (según prioridad de negocio)

- [ ] Localizar schema `category` (añadir `language` field, traducciones de `title`/`description`).
- [ ] Reemplazar `<meta http-equiv="refresh">` de la home por `i18n` config nativo de Astro 5.
- [ ] Configurar lint en `apps/web`.
- [ ] Validación de integridad en `relatedProjects` (mismo idioma) más allá del picker filter.
- [ ] Lock real de singleton en `configurationType.ts` (`__experimental_actions` o `liveEdit`).
- [ ] Decidir destino de `system.createdAt`/`updatedAt` en projectType (automatizar o borrar).
