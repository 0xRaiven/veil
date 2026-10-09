-- Migration: 20260830000011_fix_create_conversation_rpc.sql
-- Fixes create_direct_conversation to support self-conversations (Note to Self / this device)
-- and prevents duplicate key violations on conversation_members_pkey.

CREATE OR REPLACE FUNCTION public.create_direct_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv_id uuid;
  v_current_user_id uuid;
BEGIN
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Self conversation (Note to Self / This Device)
  IF other_user_id = v_current_user_id THEN
    -- Find existing self-conversation (where current user is the sole member)
    SELECT c.id INTO conv_id
    FROM public.conversations c
    JOIN public.conversation_members m ON c.id = m.conversation_id
    WHERE c.type = 'direct'
      AND m.user_id = v_current_user_id
    GROUP BY c.id
    HAVING count(m.user_id) = 1;

    IF conv_id IS NOT NULL THEN
      RETURN conv_id;
    END IF;

    -- Create new self-conversation and insert single member
    INSERT INTO public.conversations (type) VALUES ('direct') RETURNING id INTO conv_id;
    INSERT INTO public.conversation_members (conversation_id, user_id) 
    VALUES (conv_id, v_current_user_id)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;

    RETURN conv_id;
  END IF;

  -- 2. Direct conversation with another user
  SELECT c.id INTO conv_id
  FROM public.conversations c
  JOIN public.conversation_members m1 ON c.id = m1.conversation_id
  JOIN public.conversation_members m2 ON c.id = m2.conversation_id
  WHERE c.type = 'direct'
    AND m1.user_id = v_current_user_id
    AND m2.user_id = other_user_id
    AND m1.user_id != m2.user_id;

  IF conv_id IS NOT NULL THEN
    RETURN conv_id;
  END IF;

  -- Create new direct conversation and insert both members safely
  INSERT INTO public.conversations (type) VALUES ('direct') RETURNING id INTO conv_id;

  INSERT INTO public.conversation_members (conversation_id, user_id)
  VALUES
    (conv_id, v_current_user_id),
    (conv_id, other_user_id)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN conv_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_direct_conversation(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.create_direct_conversation(uuid) TO authenticated;
