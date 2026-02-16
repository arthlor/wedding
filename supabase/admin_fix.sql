-- ==========================================
-- ADMIN SETUP SCRIPT
-- ==========================================
-- This script grants full permissions to your specific Admin User.
-- Admin UUID: 26ba390e-2ea2-45ae-964e-9f74e50d1776
-- Email: anilkaraca140@gmail.com

-- 1. Enable Admin Access to Database (Approve/Reject/Select all photos)
CREATE POLICY "Admin Full Access"
ON public.photos FOR ALL
USING ( auth.uid() = '26ba390e-2ea2-45ae-964e-9f74e50d1776' );

-- 2. Storage: Allow everyone (Public) to view images
-- Necessary for the Gallery and Admin Dashboard to load images.
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'wedding_photos' );

-- 3. Storage: Allow Guests (Authenticated) to Upload
-- Guests are "authenticated" anonymously.
CREATE POLICY "Guest Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'wedding_photos' );

-- 4. Storage: Allow Admin to Delete Images
-- Essential for the "Reject" function to also remove files from storage.
CREATE POLICY "Admin Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'wedding_photos' AND auth.uid() = '26ba390e-2ea2-45ae-964e-9f74e50d1776' );
