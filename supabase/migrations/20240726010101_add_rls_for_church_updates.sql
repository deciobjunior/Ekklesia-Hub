
-- Enable RLS on the churches table if not already enabled
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;

-- Allow owners to update their own church's information
CREATE POLICY "Church owners can update their own church"
ON public.churches
FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Note: The policy for public viewing should already exist from a previous migration.
-- If not, it would be:
-- CREATE POLICY "Public churches are viewable by everyone"
-- ON public.churches
-- FOR SELECT
-- USING (true);
