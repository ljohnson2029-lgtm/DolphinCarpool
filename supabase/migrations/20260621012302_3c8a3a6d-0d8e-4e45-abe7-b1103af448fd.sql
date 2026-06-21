CREATE POLICY "Users can insert their own direct ride requests/offers"
ON public.private_ride_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);