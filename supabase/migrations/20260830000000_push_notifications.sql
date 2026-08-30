-- 1. Add push_enabled preference to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT true;

-- 2. Create push_tokens table
CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, token)
);

-- 3. Enable RLS
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can insert their own push tokens" 
ON public.push_tokens FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push tokens" 
ON public.push_tokens FOR UPDATE 
USING (true)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own push tokens" 
ON public.push_tokens FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push tokens" 
ON public.push_tokens FOR DELETE 
USING (auth.uid() = user_id);

-- 5. RPC for Push Token Registration (Bypasses RLS issues for re-assignment)
CREATE OR REPLACE FUNCTION register_push_token(
  p_token text,
  p_platform text
) RETURNS void AS $$
BEGIN
  INSERT INTO public.push_tokens (user_id, token, platform, updated_at)
  VALUES (auth.uid(), p_token, p_platform, now())
  ON CONFLICT (token) DO UPDATE 
  SET user_id = EXCLUDED.user_id,
      platform = EXCLUDED.platform,
      updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
