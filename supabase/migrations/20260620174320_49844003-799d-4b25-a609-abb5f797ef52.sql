DROP FUNCTION IF EXISTS public.get_family_schedule(uuid);

CREATE OR REPLACE FUNCTION public.get_family_schedule(student_user_id uuid)
 RETURNS TABLE(
   id uuid, type text, ride_date date, ride_time text,
   pickup_location text, dropoff_location text,
   pickup_latitude double precision, pickup_longitude double precision,
   dropoff_latitude double precision, dropoff_longitude double precision,
   seats_available integer, seats_needed integer, status text,
   user_id uuid, parent_id uuid,
   parent_first_name text, parent_last_name text, parent_email text,
   connected_parent_id uuid,
   connected_parent_first_name text, connected_parent_last_name text,
   ride_selected_children jsonb,
   joiner_selected_children jsonb
 )
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
    r.selected_children,
    rc.selected_children
  FROM public.account_links al
  JOIN public.profiles pp ON pp.id = al.parent_id
  JOIN public.rides r ON r.user_id = al.parent_id
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
    r.selected_children,
    rc.selected_children
  FROM public.account_links al
  JOIN public.profiles pp ON pp.id = al.parent_id
  JOIN public.ride_conversations rc ON rc.sender_id = al.parent_id AND rc.status = 'accepted'
  JOIN public.rides r ON r.id = rc.ride_id
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