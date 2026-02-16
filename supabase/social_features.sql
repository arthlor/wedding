-- 1. Add likes_count to photos table for performance
ALTER TABLE public.photos 
ADD COLUMN IF NOT EXISTS likes_count INT DEFAULT 0;

-- 2. Create the likes table
CREATE TABLE IF NOT EXISTS public.photo_likes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL DEFAULT auth.uid(), -- The anonymous session ID
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(photo_id, user_id) -- Prevent duplicate likes
);

-- 3. RLS Policies for Likes
ALTER TABLE public.photo_likes ENABLE ROW LEVEL SECURITY;

-- Allow anyone (even anon) to see likes
CREATE POLICY "Public View Likes"
ON public.photo_likes FOR SELECT
USING (true);

-- Allow authenticated (anon) users to toggle their own likes
CREATE POLICY "User Toggle Like"
ON public.photo_likes FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Trigger to Auto-Update likes_count
CREATE OR REPLACE FUNCTION public.handle_new_like()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.photos
  SET likes_count = likes_count + 1
  WHERE id = NEW.photo_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_unlike()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.photos
  SET likes_count = likes_count - 1
  WHERE id = OLD.photo_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind triggers
DROP TRIGGER IF EXISTS on_like_added ON public.photo_likes;
CREATE TRIGGER on_like_added
AFTER INSERT ON public.photo_likes
FOR EACH ROW EXECUTE FUNCTION public.handle_new_like();

DROP TRIGGER IF EXISTS on_like_removed ON public.photo_likes;
CREATE TRIGGER on_like_removed
AFTER DELETE ON public.photo_likes
FOR EACH ROW EXECUTE FUNCTION public.handle_unlike();
