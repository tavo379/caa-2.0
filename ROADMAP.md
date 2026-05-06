# Roadmap

Tareas accionables vivas. Para el contexto detrás de cada item ver [`docs/reviews/2026-05-05-architecture-review.md`](docs/reviews/2026-05-05-architecture-review.md).

**Guías operativas:**
- [Bulk import de proyectos al portafolio](docs/guides/bulk-import-projects.md) — cómo añadir/actualizar proyectos vía CSV + scripts.

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

## Sprint 2 — Bulk import + portafolio en producción ✅

Lo crítico hecho. Performance opcional movido a Sprint 3.

- [x] Token de write creado en sanity.io/manage y guardado en `apps/studio/.env`.
- [x] CSV `apps/studio/scripts/projects.csv` con 8 proyectos (Majha, Studio L'marc, Ververa, Pong Studio, MAP & Partners, NODO, Blue Phoenix, Backbone BW).
- [x] Script `capture-covers.ts` (Playwright + full Chromium) con fallback tipográfico para sitios con bot detection (4xx/5xx).
- [x] Script `import-projects.ts` idempotente: `_id` determinístico (`project-{slug}-{lang}`) + `createOrReplace`, transaction atómica por proyecto, reuso de cover asset si existe.
- [x] 8 proyectos × 2 idiomas + 8 metadata docs publicados en Sanity production.
- [x] Build local validado: 16 páginas de detalle + 2 listados generados.
- [x] Push a main → Vercel rebuild en curso.

Pendiente (nice-to-have, no bloqueante):
- [ ] `@sanity/image-url` para que las imágenes se sirvan responsive/WebP en lugar de tamaño original.
- [ ] Refactor `<img src={cover.asset->url}>` a `urlForImage(cover).width(...).format('webp')` en cards / [slug].
- [ ] Migrar fonts a `astro:assets <Font>` para self-host + subset automático.
- [ ] Año / stack / role específico / outcome de cada proyecto (editar en Sanity Studio cuando haya tiempo).
- [ ] Webhook de Sanity → Vercel deploy hook (rebuild automático cuando cambia contenido).

---

## Sprint 3 — Opcional (según prioridad de negocio)

- [ ] Localizar schema `category` (añadir `language` field, traducciones de `title`/`description`).
- [ ] Reemplazar `<meta http-equiv="refresh">` de la home por `i18n` config nativo de Astro 5.
- [ ] Configurar lint en `apps/web`.
- [ ] Validación de integridad en `relatedProjects` (mismo idioma) más allá del picker filter.
- [ ] Lock real de singleton en `configurationType.ts` (`__experimental_actions` o `liveEdit`).
- [ ] Decidir destino de `system.createdAt`/`updatedAt` en projectType (automatizar o borrar).
