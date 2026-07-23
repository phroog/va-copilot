-- Public VA profiles
CREATE TABLE IF NOT EXISTS user_public_profiles (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  skills TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  verified BOOLEAN DEFAULT false
);

ALTER TABLE user_public_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view public profiles
DROP POLICY IF EXISTS "Anyone can view public profiles" ON user_public_profiles;
CREATE POLICY "Anyone can view public profiles"
  ON user_public_profiles FOR SELECT USING (true);

-- Only the VA can insert/update own profile
DROP POLICY IF EXISTS "VA can insert own profile" ON user_public_profiles;
CREATE POLICY "VA can insert own profile"
  ON user_public_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "VA can update own profile" ON user_public_profiles;
CREATE POLICY "VA can update own profile"
  ON user_public_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Client reviews
CREATE TABLE IF NOT EXISTS client_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  reviewer_name TEXT NOT NULL,
  reviewer_email TEXT DEFAULT '',
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE client_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view reviews (for public profile)
DROP POLICY IF EXISTS "Anyone can view reviews" ON client_reviews;
CREATE POLICY "Anyone can view reviews"
  ON client_reviews FOR SELECT USING (true);

-- Anyone can insert a review (via token-based flow, no auth needed)
DROP POLICY IF EXISTS "Anyone can insert reviews" ON client_reviews;
CREATE POLICY "Anyone can insert reviews"
  ON client_reviews FOR INSERT WITH CHECK (true);

-- Review tokens (single-use, no expiry for simplicity)
CREATE TABLE IF NOT EXISTS review_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE review_tokens ENABLE ROW LEVEL SECURITY;

-- Anyone can read a token (by token value, for the review form)
DROP POLICY IF EXISTS "Anyone can read tokens" ON review_tokens;
CREATE POLICY "Anyone can read tokens"
  ON review_tokens FOR SELECT USING (true);

-- VAs can create tokens for own jobs
DROP POLICY IF EXISTS "VA can create tokens" ON review_tokens;
CREATE POLICY "VA can create tokens"
  ON review_tokens FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM jobs WHERE id = job_id)
  );

-- Allow updating token (mark as used)
DROP POLICY IF EXISTS "Anyone can update tokens" ON review_tokens;
CREATE POLICY "Anyone can update tokens"
  ON review_tokens FOR UPDATE USING (true);
