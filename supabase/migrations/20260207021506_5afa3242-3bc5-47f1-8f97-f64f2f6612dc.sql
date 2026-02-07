
-- Create storage bucket for merch product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('merch-images', 'merch-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

-- Allow authenticated users to upload their own merch images
CREATE POLICY "Users can upload merch images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'merch-images'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own merch images
CREATE POLICY "Users can update their own merch images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'merch-images'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own merch images
CREATE POLICY "Users can delete their own merch images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'merch-images'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Public read access for merch images
CREATE POLICY "Public can view merch images"
ON storage.objects FOR SELECT
USING (bucket_id = 'merch-images');

-- Add image_urls column to merch_products for multiple images
ALTER TABLE public.merch_products
ADD COLUMN image_urls text[] DEFAULT '{}';

-- Migrate existing image_url data to image_urls array
UPDATE public.merch_products
SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL AND image_url != '';
