DROP POLICY IF EXISTS "Insert messages for own rides" ON public.ride_messages;

CREATE POLICY "Insert messages for own rides"
ON public.ride_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND (
    (
      ride_source = 'public'
      AND (
        ride_ref_id IN (SELECT id FROM public.rides WHERE user_id = auth.uid())
        OR ride_ref_id IN (
          SELECT ride_id FROM public.ride_conversations
          WHERE (sender_id = auth.uid() OR recipient_id = auth.uid())
            AND status = 'accepted'
        )
      )
    )
    OR (
      ride_source = 'private'
      AND ride_ref_id IN (
        SELECT id FROM public.private_ride_requests
        WHERE (sender_id = auth.uid() OR recipient_id = auth.uid())
          AND status IN ('accepted', 'completed')
      )
    )
  )
);