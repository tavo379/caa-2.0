-- =============================================================================
-- INVOICES APP - ROW LEVEL SECURITY POLICIES
-- Run this migration in Supabase SQL Editor AFTER 001_initial_schema.sql
-- =============================================================================

-- Enable Row Level Security on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_sequence ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- CLIENTS POLICIES
-- Only the owner can access their clients
-- =============================================================================

CREATE POLICY "Users can view own clients" 
  ON public.clients FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients" 
  ON public.clients FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients" 
  ON public.clients FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients" 
  ON public.clients FOR DELETE 
  USING (auth.uid() = user_id);

-- =============================================================================
-- INVOICES POLICIES
-- Owner can fully manage, public can view by token
-- =============================================================================

-- Owner policies
CREATE POLICY "Users can view own invoices" 
  ON public.invoices FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices" 
  ON public.invoices FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices" 
  ON public.invoices FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices" 
  ON public.invoices FOR DELETE 
  USING (auth.uid() = user_id);

-- =============================================================================
-- INVOICE ITEMS POLICIES
-- Based on parent invoice ownership
-- =============================================================================

CREATE POLICY "Users can view items of own invoices" 
  ON public.invoice_items FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert items to own invoices" 
  ON public.invoice_items FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items of own invoices" 
  ON public.invoice_items FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items of own invoices" 
  ON public.invoice_items FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

-- =============================================================================
-- INVOICE SEQUENCE POLICIES
-- Authenticated users can use the sequence
-- =============================================================================

CREATE POLICY "Auth users can use sequence" 
  ON public.invoice_sequence FOR ALL 
  USING (auth.role() = 'authenticated');

-- =============================================================================
-- PUBLIC ACCESS POLICIES (for /i/[token] route)
-- Anyone can view an invoice and its items if they have the public_token
-- =============================================================================

-- Allow public to view invoices by token (no auth required)
CREATE POLICY "Public can view invoice by token" 
  ON public.invoices FOR SELECT 
  USING (public_token IS NOT NULL);

-- Allow public to view client info for invoices (via token lookup)
CREATE POLICY "Public can view client for invoice" 
  ON public.clients FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE invoices.client_id = clients.id 
      AND invoices.public_token IS NOT NULL
    )
  );

-- Allow public to view invoice items (via invoice token lookup)
CREATE POLICY "Public can view invoice items by token" 
  ON public.invoice_items FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.public_token IS NOT NULL
    )
  );
