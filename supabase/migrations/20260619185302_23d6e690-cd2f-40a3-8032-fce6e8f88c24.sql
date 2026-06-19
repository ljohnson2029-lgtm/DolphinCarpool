
CREATE POLICY "Users can insert their own rides"
ON public.rides FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rides"
ON public.rides FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rides"
ON public.rides FOR DELETE TO authenticated
USING (auth.uid() = user_id);
