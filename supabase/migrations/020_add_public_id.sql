ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_id TEXT;

-- Generate unique public_ids for existing rows that don't have one
DO $$
DECLARE
  rec RECORD;
  generated_id TEXT;
  done BOOLEAN;
BEGIN
  FOR rec IN SELECT user_id FROM profiles WHERE public_id IS NULL OR public_id = '' LOOP
    done := false;
    WHILE NOT done LOOP
      generated_id := 'user_' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8);
      IF NOT EXISTS (SELECT 1 FROM profiles WHERE public_id = generated_id) THEN
        UPDATE profiles SET public_id = generated_id WHERE user_id = rec.user_id;
        done := true;
      END IF;
    END LOOP;
  END LOOP;
END
$$;

-- Now make it unique and not null
ALTER TABLE profiles ALTER COLUMN public_id SET NOT NULL;
ALTER TABLE profiles ADD CONSTRAINT profiles_public_id_key UNIQUE (public_id);
