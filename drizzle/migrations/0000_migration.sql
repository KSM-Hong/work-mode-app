CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 40),
  friend_code text NOT NULL UNIQUE DEFAULT ('TREE-' || upper(substr(md5(random()::text), 1, 4))),
  tree_minutes integer NOT NULL DEFAULT 0 CHECK (tree_minutes >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (requester <> addressee)
);
CREATE UNIQUE INDEX friendships_pair ON public.friendships (least(requester, addressee), greatest(requester, addressee));
GRANT SELECT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own or connected profiles" ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR EXISTS (SELECT 1 FROM public.friendships f WHERE (f.requester = auth.uid() AND f.addressee = profiles.id) OR (f.addressee = auth.uid() AND f.requester = profiles.id)));
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "see own friendships" ON public.friendships FOR SELECT TO authenticated USING (auth.uid() IN (requester, addressee));
CREATE POLICY "accept requests to me" ON public.friendships FOR UPDATE TO authenticated USING (addressee = auth.uid()) WITH CHECK (addressee = auth.uid() AND status = 'accepted');
CREATE POLICY "remove own friendships" ON public.friendships FOR DELETE TO authenticated USING (auth.uid() IN (requester, addressee));

CREATE OR REPLACE FUNCTION public.send_friend_request(_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT id INTO target FROM profiles WHERE friend_code = upper(trim(_code));
  IF target IS NULL THEN RETURN 'not_found'; END IF;
  IF target = auth.uid() THEN RETURN 'self'; END IF;
  IF EXISTS (SELECT 1 FROM friendships WHERE least(requester,addressee)=least(auth.uid(),target) AND greatest(requester,addressee)=greatest(auth.uid(),target)) THEN RETURN 'exists'; END IF;
  INSERT INTO friendships (requester, addressee) VALUES (auth.uid(), target);
  RETURN 'sent';
END $$;
REVOKE ALL ON FUNCTION public.send_friend_request(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.send_friend_request(text) TO authenticated;