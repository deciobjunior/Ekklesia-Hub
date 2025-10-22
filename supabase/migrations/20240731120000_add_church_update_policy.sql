
CREATE POLICY "Church owners can update their own church"
ON public.churches
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);
