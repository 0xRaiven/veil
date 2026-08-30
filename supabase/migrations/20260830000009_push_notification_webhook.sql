-- 1. Create Webhook Trigger for Push Notifications
-- This trigger fires AFTER INSERT on public.messages and calls the send-message-push Edge Function

CREATE OR REPLACE TRIGGER notify_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    -- NOTE: Replace this URL with the actual project URL in production
    'https://satirxungvssxqkwpohj.supabase.co/functions/v1/send-message-push',
    'POST',
    '{"Content-Type":"application/json"}',
    '{}',
    '1000'
  );
