CREATE TABLE IF NOT EXISTS org_chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE org_chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS org_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES org_chat_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE org_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS: rooms
DROP POLICY IF EXISTS "Org members can view rooms" ON org_chat_rooms;
CREATE POLICY "Org members can view rooms"
  ON org_chat_rooms FOR SELECT USING (
    public.is_org_member(org_id, auth.uid())
  );

DROP POLICY IF EXISTS "Org members can create rooms" ON org_chat_rooms;
CREATE POLICY "Org members can create rooms"
  ON org_chat_rooms FOR INSERT WITH CHECK (
    public.is_org_member(org_id, auth.uid())
  );

-- RLS: messages
DROP POLICY IF EXISTS "Org members can view messages" ON org_chat_messages;
CREATE POLICY "Org members can view messages"
  ON org_chat_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM org_chat_rooms WHERE id = room_id AND public.is_org_member(org_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Org members can insert messages" ON org_chat_messages;
CREATE POLICY "Org members can insert messages"
  ON org_chat_messages FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM org_chat_rooms WHERE id = room_id AND public.is_org_member(org_id, auth.uid()))
  );

-- Enable realtime for org_chat_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'org_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE org_chat_messages;
  END IF;
END
$$;
