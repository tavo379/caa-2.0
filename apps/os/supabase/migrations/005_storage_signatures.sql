-- Storage bucket for signature images (public read, owner write)
-- Run in Supabase SQL editor or via the migration pipeline.

-- 1. Create the public bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Public read access (so PDFs and the public invoice page can load the image)
DROP POLICY IF EXISTS "Signatures are publicly readable" ON storage.objects;
CREATE POLICY "Signatures are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'signatures');

-- 3. Authenticated users can manage files only inside their own folder ({user_id}/...)
DROP POLICY IF EXISTS "Users can upload their own signature" ON storage.objects;
CREATE POLICY "Users can upload their own signature"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'signatures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update their own signature" ON storage.objects;
CREATE POLICY "Users can update their own signature"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'signatures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their own signature" ON storage.objects;
CREATE POLICY "Users can delete their own signature"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'signatures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
