
-- Policy for members table
CREATE POLICY "Allow authenticated users to update their own member info"
ON public.members
FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Allow church owners to update members in their church"
ON public.members
FOR UPDATE
USING (
  (get_user_role(auth.uid(), church_id) = 'Administrador'::text)
)
WITH CHECK (
  (get_user_role(auth.uid(), church_id) = 'Administrador'::text)
);


-- Policy for pastors_and_leaders table
CREATE POLICY "Allow church owners to update pastors and leaders in their church"
ON public.pastors_and_leaders
FOR UPDATE
USING (
  (get_user_role(auth.uid(), church_id) = 'Administrador'::text)
)
WITH CHECK (
  (get_user_role(auth.uid(), church_id) = 'Administrador'::text)
);

-- Policy for volunteers table
CREATE POLICY "Allow church owners to update volunteers in their church"
ON public.volunteers
FOR UPDATE
USING (
  (get_user_role(auth.uid(), church_id) = 'Administrador'::text)
)
WITH CHECK (
  (get_user_role(auth.uid(), church_id) = 'Administrador'::text)
);
