-- 1. Create the photos table
CREATE TABLE public.photos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    storage_path TEXT NOT NULL,
    uploader_session_id UUID DEFAULT auth.uid(),
    caption TEXT CHECK (char_length(caption) < 280),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_approved BOOLEAN DEFAULT FALSE, -- Gatekeeper Default
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_photos_approved_created ON public.photos (is_approved, created_at DESC);
CREATE INDEX idx_photos_uploader ON public.photos (uploader_session_id);

-- 2. Create the limit check function
CREATE OR REPLACE FUNCTION check_upload_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.photos
    WHERE uploader_session_id = auth.uid()
  ) >= 10 THEN
    RAISE EXCEPTION 'Upload limit reached. You can only upload 10 photos.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach trigger to table
CREATE TRIGGER enforce_10_photo_limit
BEFORE INSERT ON public.photos
FOR EACH ROW EXECUTE FUNCTION check_upload_limit();

-- 4. Enable RLS
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Policy 1: Public Gallery View (Approved photos only)
CREATE POLICY "Public View Approved"
ON public.photos FOR SELECT
USING ( is_approved = true );

-- Policy 2: Uploader Own View (See their own photos, even unapproved)
CREATE POLICY "Uploader View Own"
ON public.photos FOR SELECT
USING ( uploader_session_id = auth.uid() );

-- Policy 3: Guest Uploads (Insert allowed, limit enforced by trigger)
CREATE POLICY "Guest Insert"
ON public.photos FOR INSERT
TO authenticated
WITH CHECK ( uploader_session_id = auth.uid() );

-- Policy 4: Admin Full Access (Replace UUID with actual Admin UUID)
-- CREATE POLICY "Admin Full Access"
-- ON public.photos FOR ALL
-- USING ( auth.uid() = 'YOUR-ADMIN-UUID-HERE' );

-- Storage Policies (Bucket: wedding_photos)
-- You need to create a bucket named 'wedding_photos' in Supabase Storage.
-- Public Access: Enabled (for Netlify proxy)
-- Policy: "Give users access to own folder" 
-- (INSERT) bucket_id = 'wedding_photos' AND auth.uid() = owner
-- (SELECT) bucket_id = 'wedding_photos'
