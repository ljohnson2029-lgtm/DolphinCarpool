CREATE POLICY "Ride owners can view profiles of pending requesters"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT rc.sender_id
    FROM public.ride_conversations rc
    WHERE rc.recipient_id = auth.uid()
      AND rc.status = 'pending'
    UNION
    SELECT rc.recipient_id
    FROM public.ride_conversations rc
    WHERE rc.sender_id = auth.uid()
      AND rc.status = 'pending'
  )
);

CREATE POLICY "Users can view profiles of pending private ride request counterparts"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT pr.sender_id
    FROM public.private_ride_requests pr
    WHERE pr.recipient_id = auth.uid()
      AND pr.status = 'pending'
    UNION
    SELECT pr.recipient_id
    FROM public.private_ride_requests pr
    WHERE pr.sender_id = auth.uid()
      AND pr.status = 'pending'
  )
);