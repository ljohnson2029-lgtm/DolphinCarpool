CREATE INDEX IF NOT EXISTS idx_ride_messages_ref ON public.ride_messages (ride_ref_id, ride_source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ride_messages_sender ON public.ride_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_ride_messages_unread ON public.ride_messages (ride_ref_id, ride_source) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_space ON public.recurring_schedules (space_id, status);
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_proposer ON public.recurring_schedules (proposer_id);
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_recipient ON public.recurring_schedules (recipient_id);