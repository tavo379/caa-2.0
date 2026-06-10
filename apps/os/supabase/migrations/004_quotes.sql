-- =============================================================================
-- CACAO OS - QUOTES MODULE (cotizador inteligente)
-- Run this migration in Supabase SQL Editor AFTER 003_projects.sql
-- =============================================================================

-- =============================================================================
-- CLIENTS: pricing profile + anchor project (Reglas 1 y 10)
-- =============================================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS rate_profile TEXT CHECK (rate_profile IN ('international', 'local_premium', 'local_standard')),
  ADD COLUMN IF NOT EXISTS custom_rate NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS anchor_label TEXT,
  ADD COLUMN IF NOT EXISTS anchor_hours NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS anchor_price NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS anchor_currency TEXT CHECK (anchor_currency IN ('USD', 'COP'));

-- =============================================================================
-- TABLES
-- =============================================================================

-- Global quote engine settings (singleton per user, como user_settings)
CREATE TABLE IF NOT EXISTS public.quote_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rate_international_usd NUMERIC(12,2) DEFAULT 30,
  rate_local_premium_cop NUMERIC(12,2) DEFAULT 115000,
  rate_local_standard_cop NUMERIC(12,2) DEFAULT 60000,
  usd_cop_rate NUMERIC(12,2) DEFAULT 4000,
  fixed_price_factor NUMERIC(4,2) DEFAULT 1.30,
  qa_pct NUMERIC(5,2) DEFAULT 12,
  min_billable_hours NUMERIC(5,2) DEFAULT 4,
  volume_discount_cap_pct NUMERIC(5,2) DEFAULT 30,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deliverable presets / market anchors (Regla 6, editables en configuración)
CREATE TABLE IF NOT EXISTS public.quote_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT DEFAULT 'standalone' CHECK (kind IN ('standalone', 'bundle')),
  currency TEXT DEFAULT 'COP' CHECK (currency IN ('USD', 'COP')),
  price_min NUMERIC(14,2),
  price_max NUMERIC(14,2),
  hours_min NUMERIC(8,2),
  hours_max NUMERIC(8,2),
  -- piso de mercado: alerta "estás cotizando bajo mercado" si el precio queda debajo
  market_floor NUMERIC(14,2),
  -- jerarquía de esfuerzo (Regla 6): 1=Elementor, 2=Shopify bundle, 3=Shopify standalone, 4=tienda completa
  hierarchy_rank INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quotes (cabecera). Tarifas/TRM/factores se copian como snapshot al crear:
-- cambiar la configuración después no altera cotizaciones existentes.
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  project_type TEXT,
  rate_profile TEXT NOT NULL CHECK (rate_profile IN ('international', 'local_premium', 'local_standard')),
  hourly_rate NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'COP')),
  usd_cop_rate NUMERIC(12,2) DEFAULT 4000,
  qa_pct NUMERIC(5,2) DEFAULT 12,
  fixed_factor NUMERIC(4,2) DEFAULT 1.30,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired')),
  issue_date DATE DEFAULT CURRENT_DATE,
  valid_until DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  -- toggles de export (Regla 12: nunca mostrar horas/tarifa salvo activación explícita)
  show_hours BOOLEAN DEFAULT FALSE,
  show_rate BOOLEAN DEFAULT FALSE,
  payment_terms TEXT,
  notes TEXT,
  -- denormalizados para el listado (la app los recalcula al guardar)
  total_hours NUMERIC(10,2) DEFAULT 0,
  total_price NUMERIC(14,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Quote items
CREATE TABLE IF NOT EXISTS public.quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  pricing_mode TEXT DEFAULT 'hourly' CHECK (pricing_mode IN ('hourly', 'fixed', 'tbd')),
  -- puntos de toque (Regla 3): ui, db, payments, emails, admin, third_party, concurrency
  components TEXT[] DEFAULT '{}',
  complexity_suggested TEXT CHECK (complexity_suggested IN ('low', 'medium', 'high')),
  complexity TEXT CHECK (complexity IN ('low', 'medium', 'high')),
  reuse_pct NUMERIC(5,2) DEFAULT 0 CHECK (reuse_pct >= 0 AND reuse_pct <= 100),
  hours_suggested NUMERIC(8,2),
  hours NUMERIC(8,2),
  qty NUMERIC(8,2) DEFAULT 1,
  volume_discount_pct NUMERIC(5,2) DEFAULT 0 CHECK (volume_discount_pct >= 0 AND volume_discount_pct <= 30),
  -- overrides manuales: si están, mandan sobre el cálculo del motor
  price_override NUMERIC(14,2),
  -- modo fixed: precio cerrado (validado >= horas x tarifa x factor en la app)
  fixed_price NUMERIC(14,2),
  preset_id UUID REFERENCES public.quote_presets(id) ON DELETE SET NULL,
  -- modo tbd ("A cotizar"): qué información falta para poder cotizar
  missing_info TEXT[] DEFAULT '{}',
  -- snapshot del cálculo al guardar (horas con QA embebido y total de línea)
  line_hours NUMERIC(10,2) DEFAULT 0,
  line_total NUMERIC(14,2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quote sequence (numeración COT-YYYY-NNN segura ante concurrencia)
CREATE TABLE IF NOT EXISTS public.quote_sequence (
  year INTEGER PRIMARY KEY,
  last_number INTEGER DEFAULT 0
);

-- =============================================================================
-- FUNCTION: Generate Quote Number
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  new_number INTEGER;
BEGIN
  INSERT INTO public.quote_sequence (year, last_number)
  VALUES (current_year, 1)
  ON CONFLICT (year)
  DO UPDATE SET last_number = public.quote_sequence.last_number + 1
  RETURNING last_number INTO new_number;

  RETURN 'COT-' || current_year || '-' || LPAD(new_number::TEXT, 3, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_quote_number() TO authenticated;

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON public.quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON public.quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_presets_user_id ON public.quote_presets(user_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.quote_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- quote_settings
CREATE POLICY "Users can view own quote settings"
  ON public.quote_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quote settings"
  ON public.quote_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quote settings"
  ON public.quote_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- quote_presets
CREATE POLICY "Users can view own quote presets"
  ON public.quote_presets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quote presets"
  ON public.quote_presets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quote presets"
  ON public.quote_presets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quote presets"
  ON public.quote_presets FOR DELETE
  USING (auth.uid() = user_id);

-- quotes
CREATE POLICY "Users can view own quotes"
  ON public.quotes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quotes"
  ON public.quotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quotes"
  ON public.quotes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quotes"
  ON public.quotes FOR DELETE
  USING (auth.uid() = user_id);

-- quote_items: based on parent quote ownership
CREATE POLICY "Users can view items of own quotes"
  ON public.quote_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert items to own quotes"
  ON public.quote_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items of own quotes"
  ON public.quote_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items of own quotes"
  ON public.quote_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.user_id = auth.uid()
    )
  );

-- =============================================================================
-- TRIGGER: updated_at en quotes
-- =============================================================================

CREATE TRIGGER update_quotes_updated_at
    BEFORE UPDATE ON public.quotes
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- =============================================================================
-- SEED: settings + presets para los usuarios existentes (app de un solo usuario)
-- Anclas vigentes Local Premium, validadas contra mercado colombiano 2026.
-- =============================================================================

INSERT INTO public.quote_settings (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.quote_presets
  (user_id, name, kind, currency, price_min, price_max, hours_min, hours_max, market_floor, hierarchy_rank, sort_order)
SELECT u.id, p.*
FROM auth.users u,
(VALUES
  ('Landing WordPress/Elementor (plantilla + personalización)', 'standalone', 'COP', 900000::numeric, 1400000::numeric, 4::numeric, 8::numeric, 600000::numeric, 1, 1),
  ('Página Shopify dentro de proyecto multi-página (>=10 páginas)', 'bundle', 'COP', 500000::numeric, 650000::numeric, 3::numeric, 5::numeric, 500000::numeric, 2, 3),
  ('Página Shopify a medida standalone (sección/landing Liquid custom)', 'standalone', 'COP', 1200000::numeric, 1800000::numeric, 8::numeric, 12::numeric, 1200000::numeric, 3, 2),
  ('Tienda Shopify completa custom (12-15 páginas, multi-mercado)', 'standalone', 'COP', 6500000::numeric, 9500000::numeric, 60::numeric, 90::numeric, 6000000::numeric, 4, 4)
) AS p(name, kind, currency, price_min, price_max, hours_min, hours_max, market_floor, hierarchy_rank, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.quote_presets qp WHERE qp.user_id = u.id
);
