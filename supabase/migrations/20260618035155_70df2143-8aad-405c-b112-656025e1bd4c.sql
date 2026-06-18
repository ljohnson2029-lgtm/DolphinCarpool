
-- 1. Create profiles_public view with only safe, display-only fields.
-- Phone is only exposed if user opted-in via share_phone.
-- Coordinates only when show_on_map is true.
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = off) AS
SELECT
  id,
  username,
  first_name,
  last_name,
  avatar_url,
  account_type,
  grade_level,
  car_make,
  car_model,
  car_color,
  car_seats,
  show_on_map,
  share_phone,
  share_email,
  CASE WHEN share_phone THEN phone_number ELSE NULL END AS phone_number,
  CASE WHEN show_on_map THEN home_latitude ELSE NULL END AS home_latitude,
  CASE WHEN show_on_map THEN home_longitude ELSE NULL END AS home_longitude,
  accept_requests_from_anyone,
  profile_complete
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated;

-- 2. Drop the over-broad SELECT policies on profiles that exposed
--    sensitive fields (home_address, GPS, license_plate, emergency contacts,
--    parent_guardian_*) to every authenticated user with an active ride or
--    a pending/any ride request.
DROP POLICY IF EXISTS "Users can view basic profiles of ride creators" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles of pending private ride participants" ON public.profiles;

-- 3. Tighten existing broad policies so full-row access is only granted when
--    the relationship is actually confirmed/accepted (not just any existence).
DROP POLICY IF EXISTS "Users can view profiles of conversation participants" ON public.profiles;
CREATE POLICY "Users can view profiles of accepted conversation participants"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT rc.sender_id FROM public.ride_conversations rc
       WHERE rc.recipient_id = auth.uid() AND rc.status = 'accepted'
      UNION
      SELECT rc.recipient_id FROM public.ride_conversations rc
       WHERE rc.sender_id = auth.uid() AND rc.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Users can view profiles of ride request participants" ON public.profiles;
CREATE POLICY "Users can view profiles of accepted ride request participants"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT pr.sender_id FROM public.private_ride_requests pr
       WHERE pr.recipient_id = auth.uid() AND pr.status = 'accepted'
      UNION
      SELECT pr.recipient_id FROM public.private_ride_requests pr
       WHERE pr.sender_id = auth.uid() AND pr.status = 'accepted'
    )
  );
