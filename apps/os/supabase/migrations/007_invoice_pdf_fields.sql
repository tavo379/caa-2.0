-- =============================================================================
-- ADDITIONAL FIELDS FOR THE INVOICE PDF
-- - payment_info: payment instructions (e.g. bank account to deposit into).
-- - legal_disclaimer: fixed legal statement (e.g. parágrafo 2, art. 383 ET Colombia).
-- Both are shown in the PDF and the public viewer. Run in the SQL Editor.
-- =============================================================================

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS payment_info TEXT,
  ADD COLUMN IF NOT EXISTS legal_disclaimer TEXT;
