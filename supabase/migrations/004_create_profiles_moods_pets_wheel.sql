-- Add status column to pitches
ALTER TABLE pitches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','interview','offer','won','lost'));

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  full_name TEXT DEFAULT '',
  desired_rate TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- User moods table
CREATE TABLE IF NOT EXISTS user_moods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  mood TEXT NOT NULL,
  mood_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, mood_date)
);

ALTER TABLE user_moods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own moods"
  ON user_moods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mood"
  ON user_moods FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User pets table
CREATE TABLE IF NOT EXISTS user_pets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  pet_name TEXT DEFAULT 'Mochi',
  hunger INT DEFAULT 80,
  happiness INT DEFAULT 80,
  last_fed TIMESTAMPTZ DEFAULT now(),
  last_played TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pet"
  ON user_pets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pet"
  ON user_pets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pet"
  ON user_pets FOR UPDATE USING (auth.uid() = user_id);

-- Wheel spins table
CREATE TABLE IF NOT EXISTS wheel_spins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  spin_date DATE DEFAULT CURRENT_DATE,
  prize TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, spin_date)
);

ALTER TABLE wheel_spins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own spins"
  ON wheel_spins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own spin"
  ON wheel_spins FOR INSERT WITH CHECK (auth.uid() = user_id);
