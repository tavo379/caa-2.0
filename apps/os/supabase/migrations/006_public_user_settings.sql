-- =============================================================================
-- PUBLIC READ ACCESS FOR user_settings
-- El visor publico /i/[token] y el PDF /api/pdf corren SIN sesion (anon).
-- Sin esta politica, RLS devuelve 0 filas de user_settings al publico, asi que
-- el PDF muestra valores por defecto y sin firma/logo.
--
-- Solo se exponen los settings de un usuario que YA tiene al menos una factura
-- con public_token (es decir, que ya comparte facturas publicas). Esos datos
-- (nombre del negocio, NIT, firma, logo) ya aparecen en la factura publica.
-- Run en Supabase SQL Editor.
-- =============================================================================

CREATE POLICY "Public can view settings for shared invoices"
  ON public.user_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.user_id = user_settings.user_id
      AND invoices.public_token IS NOT NULL
    )
  );
