
-- FIX 1: series_spaces unilateral creation profile exposure
ALTER TABLE public.series_spaces
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

ALTER TABLE public.series_spaces
  DROP CONSTRAINT IF EXISTS series_spaces_status_check;
ALTER TABLE public.series_spaces
  ADD CONSTRAINT series_spaces_status_check CHECK (status IN ('pending','accepted'));

UPDATE public.series_spaces
SET status = 'accepted',
    accepted_at = COALESCE(accepted_at, now()),
    created_by = COALESCE(created_by, parent_a_id)
WHERE status IS DISTINCT FROM 'accepted' OR created_by IS NULL;

DROP POLICY IF EXISTS "Users can create series spaces" ON public.series_spaces;
CREATE POLICY "Users can create series spaces" ON public.series_spaces
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND status = 'pending'
    AND (auth.uid() = parent_a_id OR auth.uid() = parent_b_id)
  );

DROP POLICY IF EXISTS "Other party can accept series space" ON public.series_spaces;
CREATE POLICY "Other party can accept series space" ON public.series_spaces
  FOR UPDATE TO authenticated
  USING (
    status = 'pending'
    AND (auth.uid() = parent_a_id OR auth.uid() = parent_b_id)
    AND auth.uid() <> created_by
  )
  WITH CHECK (
    status = 'accepted'
    AND (auth.uid() = parent_a_id OR auth.uid() = parent_b_id)
  );

DROP POLICY IF EXISTS "Series space partners can view each other's profiles" ON public.profiles;
CREATE POLICY "Series space partners can view each other's profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (id IN (
    SELECT CASE WHEN ss.parent_a_id = auth.uid() THEN ss.parent_b_id ELSE ss.parent_a_id END
    FROM public.series_spaces ss
    WHERE (ss.parent_a_id = auth.uid() OR ss.parent_b_id = auth.uid())
      AND ss.status = 'accepted'
  ));

DROP POLICY IF EXISTS "Series space partners can view each other's children" ON public.children;
CREATE POLICY "Series space partners can view each other's children" ON public.children
  FOR SELECT TO authenticated
  USING (user_id IN (
    SELECT CASE WHEN ss.parent_a_id = auth.uid() THEN ss.parent_b_id ELSE ss.parent_a_id END
    FROM public.series_spaces ss
    WHERE (ss.parent_a_id = auth.uid() OR ss.parent_b_id = auth.uid())
      AND ss.status = 'accepted'
  ));

DROP POLICY IF EXISTS "Students can view children of series space parents" ON public.children;
CREATE POLICY "Students can view children of series space parents" ON public.children
  FOR SELECT TO authenticated
  USING (user_id IN (
    SELECT CASE WHEN ss.parent_a_id = al.parent_id THEN ss.parent_b_id ELSE ss.parent_a_id END
    FROM public.account_links al
    JOIN public.series_spaces ss
      ON (ss.parent_a_id = al.parent_id OR ss.parent_b_id = al.parent_id)
    WHERE al.student_id = auth.uid()
      AND al.status = 'approved'
      AND ss.status = 'accepted'
  ));

DROP POLICY IF EXISTS "Students can view vehicles of linked parent series participants" ON public.vehicles;
CREATE POLICY "Students can view vehicles of linked parent series participants" ON public.vehicles
  FOR SELECT TO authenticated
  USING (user_id IN (
    SELECT al.parent_id
    FROM public.account_links al
    WHERE al.student_id = auth.uid() AND al.status = 'approved'
    UNION
    SELECT CASE WHEN ss.parent_a_id = al.parent_id THEN ss.parent_b_id ELSE ss.parent_a_id END
    FROM public.account_links al
    JOIN public.series_spaces ss
      ON (ss.parent_a_id = al.parent_id OR ss.parent_b_id = al.parent_id)
    WHERE al.student_id = auth.uid()
      AND al.status = 'approved'
      AND ss.status = 'accepted'
  ));

-- FIX 2: rides.selected_children exposure
CREATE TABLE IF NOT EXISTS public.ride_owner_child_selections (
  ride_id uuid PRIMARY KEY REFERENCES public.rides(id) ON DELETE CASCADE,
  child_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ride_owner_child_selections TO authenticated;
GRANT ALL ON public.ride_owner_child_selections TO service_role;

ALTER TABLE public.ride_owner_child_selections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ride owner manages own child selections" ON public.ride_owner_child_selections;
CREATE POLICY "Ride owner manages own child selections" ON public.ride_owner_child_selections
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.rides r
    WHERE r.id = ride_owner_child_selections.ride_id AND r.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.rides r
    WHERE r.id = ride_owner_child_selections.ride_id AND r.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Accepted ride participants can view child selections" ON public.ride_owner_child_selections;
CREATE POLICY "Accepted ride participants can view child selections" ON public.ride_owner_child_selections
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ride_conversations rc
    WHERE rc.ride_id = ride_owner_child_selections.ride_id
      AND rc.status = 'accepted'
      AND (rc.sender_id = auth.uid() OR rc.recipient_id = auth.uid())
  ));

INSERT INTO public.ride_owner_child_selections (ride_id, child_ids)
SELECT id, COALESCE(selected_children, '[]'::jsonb)
FROM public.rides
WHERE selected_children IS NOT NULL
ON CONFLICT (ride_id) DO NOTHING;

ALTER TABLE public.rides DROP COLUMN IF EXISTS selected_children;

-- Replace get_family_schedule to pull child selections from the new table
CREATE OR REPLACE FUNCTION public.get_family_schedule(student_user_id uuid)
 RETURNS TABLE(id uuid, type text, ride_date date, ride_time text, pickup_location text, dropoff_location text, pickup_latitude double precision, pickup_longitude double precision, dropoff_latitude double precision, dropoff_longitude double precision, seats_available integer, seats_needed integer, status text, user_id uuid, parent_id uuid, parent_first_name text, parent_last_name text, parent_email text, connected_parent_id uuid, connected_parent_first_name text, connected_parent_last_name text, ride_selected_children jsonb, joiner_selected_children jsonb)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    r.id, r.type, r.ride_date, r.ride_time::text,
    r.pickup_location, r.dropoff_location,
    r.pickup_latitude, r.pickup_longitude,
    r.dropoff_latitude, r.dropoff_longitude,
    r.seats_available, r.seats_needed, r.status, r.user_id,
    al.parent_id,
    pp.first_name, pp.last_name,
    public.get_user_email(al.parent_id),
    CASE WHEN rc.sender_id = al.parent_id THEN rc.recipient_id ELSE rc.sender_id END,
    cp.first_name, cp.last_name,
    rocs.child_ids,
    rc.selected_children
  FROM public.account_links al
  JOIN public.profiles pp ON pp.id = al.parent_id
  JOIN public.rides r ON r.user_id = al.parent_id
  LEFT JOIN public.ride_owner_child_selections rocs ON rocs.ride_id = r.id
  LEFT JOIN public.ride_conversations rc ON rc.ride_id = r.id AND rc.status = 'accepted'
  LEFT JOIN public.profiles cp ON cp.id = CASE WHEN rc.sender_id = al.parent_id THEN rc.recipient_id ELSE rc.sender_id END
  WHERE auth.uid() = student_user_id
    AND al.student_id = student_user_id AND al.status = 'approved'
    AND r.status = 'active' AND r.ride_date >= current_date

  UNION

  SELECT
    r.id, r.type, r.ride_date, r.ride_time::text,
    r.pickup_location, r.dropoff_location,
    r.pickup_latitude, r.pickup_longitude,
    r.dropoff_latitude, r.dropoff_longitude,
    r.seats_available, r.seats_needed, r.status, r.user_id,
    al.parent_id,
    pp.first_name, pp.last_name,
    public.get_user_email(al.parent_id),
    r.user_id,
    op.first_name, op.last_name,
    rocs.child_ids,
    rc.selected_children
  FROM public.account_links al
  JOIN public.profiles pp ON pp.id = al.parent_id
  JOIN public.ride_conversations rc ON rc.sender_id = al.parent_id AND rc.status = 'accepted'
  JOIN public.rides r ON r.id = rc.ride_id
  LEFT JOIN public.ride_owner_child_selections rocs ON rocs.ride_id = r.id
  JOIN public.profiles op ON op.id = r.user_id
  WHERE auth.uid() = student_user_id
    AND al.student_id = student_user_id AND al.status = 'approved'
    AND r.status = 'active' AND r.ride_date >= current_date
    AND r.user_id <> al.parent_id

  UNION

  SELECT
    pr.id, pr.request_type::text, pr.ride_date, pr.pickup_time::text,
    pr.pickup_address, pr.dropoff_address,
    pr.pickup_latitude::double precision, pr.pickup_longitude::double precision,
    pr.dropoff_latitude::double precision, pr.dropoff_longitude::double precision,
    pr.seats_offered, pr.seats_needed, pr.status::text,
    al.parent_id, al.parent_id,
    pp.first_name, pp.last_name,
    public.get_user_email(al.parent_id),
    CASE WHEN pr.sender_id = al.parent_id THEN pr.recipient_id ELSE pr.sender_id END,
    opp.first_name, opp.last_name,
    NULL::jsonb,
    NULL::jsonb
  FROM public.account_links al
  JOIN public.profiles pp ON pp.id = al.parent_id
  JOIN public.private_ride_requests pr
    ON pr.status = 'accepted' AND (pr.sender_id = al.parent_id OR pr.recipient_id = al.parent_id)
  LEFT JOIN public.profiles opp ON opp.id = CASE WHEN pr.sender_id = al.parent_id THEN pr.recipient_id ELSE pr.sender_id END
  WHERE auth.uid() = student_user_id
    AND al.student_id = student_user_id AND al.status = 'approved'
    AND pr.ride_date >= current_date;
$function$;
