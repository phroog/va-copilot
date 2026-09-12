-- ═══════════════════════════════════════════════════════════════
-- Sari Learn Engine — VA paths, skill tree, levels, progress, ranks
-- Duolingo-style gamified education core. Levels are AI-generated
-- interactive lessons cached in learn_levels.content (JSONB).
-- ═══════════════════════════════════════════════════════════════

create table if not exists va_paths (
  id uuid default gen_random_uuid() primary key,
  slug text not null unique,
  title text not null,
  subtitle text not null,
  description text not null default '',
  emoji text not null default '⭐',
  color text not null default 'from-kawaii-purple to-kawaii-pink',
  order_index int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists skill_nodes (
  id uuid default gen_random_uuid() primary key,
  path_id uuid references va_paths(id) on delete cascade not null,
  parent_id uuid references skill_nodes(id) on delete cascade,
  title text not null,
  subtitle text not null default '',
  emoji text not null default '✨',
  depth int not null default 0,
  order_index int not null default 0,
  unlocks_tool text,               -- route slug of a tool unlocked by completing this node
  xp_reward int not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists learn_levels (
  id uuid default gen_random_uuid() primary key,
  node_id uuid references skill_nodes(id) on delete cascade not null,
  title text not null,
  subtitle text not null default '',
  order_index int not null default 0,
  xp_reward int not null default 30,
  duration_minutes int not null default 3,
  content jsonb,                   -- structured interactive lesson (generated + cached)
  status text not null default 'ready' check (status in ('ready','generating','failed')),
  seed_key text,                   -- deterministic cache key
  generated_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists learn_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  level_id uuid references learn_levels(id) on delete cascade not null,
  node_id uuid references skill_nodes(id) on delete cascade not null,
  status text not null default 'unlocked' check (status in ('locked','unlocked','completed')),
  stars int not null default 0,
  xp_earned int not null default 0,
  attempts int not null default 0,
  completed_at timestamptz,
  unique(user_id, level_id)
);

create table if not exists leaderboard_bots (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  avatar text not null default '🤖',
  base_xp int not null default 0,
  tier int not null default 1,
  created_at timestamptz not null default now()
);

alter table profiles add column if not exists xp int not null default 0;
alter table profiles add column if not exists active_path_id uuid references va_paths(id) on delete set null;

alter table va_paths enable row level security;
alter table skill_nodes enable row level security;
alter table learn_levels enable row level security;
alter table learn_progress enable row level security;
alter table leaderboard_bots enable row level security;

drop policy if exists "read paths" on va_paths;
create policy "read paths" on va_paths for select using (true);

drop policy if exists "read nodes" on skill_nodes;
create policy "read nodes" on skill_nodes for select using (true);

drop policy if exists "read levels" on learn_levels;
create policy "read levels" on learn_levels for select using (true);

drop policy if exists "read own progress" on learn_progress;
drop policy if exists "insert own progress" on learn_progress;
drop policy if exists "update own progress" on learn_progress;
create policy "read own progress" on learn_progress for select using (auth.uid() = user_id);
create policy "insert own progress" on learn_progress for insert with check (auth.uid() = user_id);
create policy "update own progress" on learn_progress for update using (auth.uid() = user_id);

drop policy if exists "read bots" on leaderboard_bots;
create policy "read bots" on leaderboard_bots for select using (true);

-- ═══════════════════════════════════════════════════════════════
-- Seed VA paths (the "what do you want to become" careers)
-- ═══════════════════════════════════════════════════════════════
insert into va_paths (slug, title, subtitle, description, emoji, color, order_index) values
  ('social-media-va', 'Social Media VA', 'Grow brands, not just accounts', 'Create scroll-stopping content, run accounts for clients and turn followers into customers.', '📱', 'from-kawaii-purple to-kawaii-pink', 1),
  ('executive-assistant', 'Executive Assistant', 'The right hand every founder needs', 'Own inboxes, calendars and logistics so busy executives can focus on what matters.', '🗂️', 'from-kawaii-lavender to-kawaii-purple', 2),
  ('ecommerce-va', 'E-commerce VA', 'Run the store behind the scenes', 'List products, fulfil orders, support customers and keep an online store running 24/7.', '🛒', 'from-kawaii-coral to-kawaii-pink', 3),
  ('real-estate-va', 'Real Estate VA', 'Close more doors', 'Handle listings, leads and transactions so agents can sell more homes.', '🏠', 'from-kawaii-peach to-kawaii-coral', 4),
  ('bookkeeping-va', 'Bookkeeping VA', 'Make the numbers make sense', 'Track income, expenses and reports so business owners always know their numbers.', '💸', 'from-kawaii-mint to-kawaii-purple', 5),
  ('general-va', 'General VA', 'The all-rounder clients love', 'Master the core admin skills every client needs, then specialise later.', '⭐', 'from-kawaii-pink to-kawaii-coral', 6)
on conflict (slug) do nothing;

-- ═══════════════════════════════════════════════════════════════
-- Seed skill tree nodes per path (root → branches). depth/order give
-- the layout; parent_id gives unlock order. One node = one skill.
-- ═══════════════════════════════════════════════════════════════
with p as (select id, slug from va_paths)
insert into skill_nodes (path_id, parent_id, title, subtitle, emoji, depth, order_index, unlocks_tool, xp_reward)
select
  p.id,
  null,
  n.title, n.subtitle, n.emoji, n.depth, n.order_index, n.unlocks_tool, n.xp_reward
from (values
  -- Social Media VA
  ('social-media-va', 'VA Foundations', 'Client-ready basics every VA needs before anything else', '🧭', 0, 1, null, 100),
  ('social-media-va', 'Content Creation', 'Write hooks and posts people actually stop for', '✍️', 1, 1, null, 120),
  ('social-media-va', 'Platform Mastery', 'Instagram, TikTok, LinkedIn — learn the rules of each', '📲', 1, 2, null, 120),
  ('social-media-va', 'Growth & Analytics', 'Read the numbers and grow an audience on purpose', '📈', 2, 1, null, 150),
  ('social-media-va', 'Community Management', 'Turn followers into a loyal, engaged community', '💬', 2, 2, '/dashboard/live-feed', 150),
  -- Executive Assistant
  ('executive-assistant', 'VA Foundations', 'Client-ready basics every VA needs before anything else', '🧭', 0, 1, null, 100),
  ('executive-assistant', 'Inbox Zero', 'Process a full inbox to empty — every single day', '📬', 1, 1, null, 120),
  ('executive-assistant', 'Calendar & Scheduling', 'Own the calendar so your boss is never double-booked', '📅', 1, 2, '/dashboard/calendar', 120),
  ('executive-assistant', 'Travel & Logistics', 'Plan trips and handle logistics without the chaos', '✈️', 2, 1, null, 150),
  ('executive-assistant', 'Meeting & Reporting', 'Run agendas, minutes and follow-ups like a pro', '📋', 2, 2, null, 150),
  -- E-commerce VA
  ('ecommerce-va', 'Store Foundations', 'Understand how a store runs before you touch it', '🧭', 0, 1, null, 100),
  ('ecommerce-va', 'Product Listings', 'Write listings that rank and sell', '🏷️', 1, 1, null, 120),
  ('ecommerce-va', 'Order Fulfilment', 'Ship orders right, fast, and without drama', '📦', 1, 2, null, 120),
  ('ecommerce-va', 'Customer Support', 'Keep customers happy and reviews 5 stars', '💌', 2, 1, null, 150),
  ('ecommerce-va', 'Store Analytics', 'Know what sells and double down on it', '📊', 2, 2, null, 150),
  -- Real Estate VA
  ('real-estate-va', 'Real Estate Foundations', 'The language of listings, agents and closings', '🧭', 0, 1, null, 100),
  ('real-estate-va', 'Listing Management', 'Build listings that make buyers click', '🏡', 1, 1, null, 120),
  ('real-estate-va', 'Lead Follow-Up', 'Never let a hot lead go cold', '🔥', 1, 2, null, 120),
  ('real-estate-va', 'Transaction Coordination', 'Keep every deal on track to closing day', '🔑', 2, 1, null, 150),
  ('real-estate-va', 'Marketing for Agents', 'Help agents get seen and get clients', '📣', 2, 2, null, 150),
  -- Bookkeeping VA
  ('bookkeeping-va', 'Finance Foundations', 'The basics every money person must know', '🧭', 0, 1, null, 100),
  ('bookkeeping-va', 'Invoicing & Payments', 'Get clients paid and keep records clean', '🧾', 1, 1, '/dashboard/invoices', 120),
  ('bookkeeping-va', 'Expense Tracking', 'Track every dollar in and out', '💳', 1, 2, '/dashboard/finances', 120),
  ('bookkeeping-va', 'Reconciliation', 'Make the books match reality — monthly', '✅', 2, 1, null, 150),
  ('bookkeeping-va', 'Reporting & Taxes', 'Turn numbers into reports owners understand', '📑', 2, 2, null, 150),
  -- General VA
  ('general-va', 'VA Foundations', 'Client-ready basics every VA needs before anything else', '🧭', 0, 1, null, 100),
  ('general-va', 'Email & Admin', 'Handle inboxes, folders and admin like a pro', '📧', 1, 1, null, 120),
  ('general-va', 'Data & Documents', 'Organise data and docs so nothing is lost', '🗃️', 1, 2, '/dashboard/vault', 120),
  ('general-va', 'Research & Sourcing', 'Find anything, fast — and present it clearly', '🔍', 2, 1, null, 150),
  ('general-va', 'Client Communication', 'Sound professional in every message', '🤝', 2, 2, '/dashboard/clients', 150)
) as n(slug, title, subtitle, emoji, depth, order_index, unlocks_tool, xp_reward)
join p on p.slug = n.slug
on conflict do nothing;

-- Attach branch nodes to their parents (per path, by title).
do $$
declare
  pid uuid;
  root uuid;
begin
  for pid in select id from va_paths loop
    select id into root from skill_nodes where path_id = pid and depth = 0 limit 1;
    if root is not null then
      update skill_nodes set parent_id = root where path_id = pid and depth = 1;
      update skill_nodes set parent_id = (select id from skill_nodes where path_id = pid and depth = 1 and order_index = 1 limit 1)
        where path_id = pid and depth = 2 and order_index = 1;
      update skill_nodes set parent_id = (select id from skill_nodes where path_id = pid and depth = 1 and order_index = 2 limit 1)
        where path_id = pid and depth = 2 and order_index = 2;
    end if;
  end loop;
end $$;

-- ═══════════════════════════════════════════════════════════════
-- Seed one level (lesson) per node. Content is generated on first
-- play (DeepSeek) and cached; fallback content ships in the app.
-- ═══════════════════════════════════════════════════════════════
insert into learn_levels (node_id, title, subtitle, order_index, xp_reward, duration_minutes, seed_key)
select
  n.id,
  n.title || ' · Mission 1',
  n.subtitle,
  1,
  n.xp_reward,
  3,
  'level:' || n.id::text
from skill_nodes n
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════════
-- Seed leaderboard bots (the ranks start flooded with "players").
-- base_xp spread across every tier so the top always feels far away.
-- ═══════════════════════════════════════════════════════════════
insert into leaderboard_bots (name, avatar, base_xp, tier) values
  ('Ava The Closer', '👑', 7400, 7),
  ('Mia Hustles', '💎', 6100, 6),
  ('Princess D.', '💎', 5900, 6),
  ('TopG_VA', '🚀', 5050, 6),
  ('Boss Babe VA', '🚀', 4600, 6),
  ('Leo G.', '🚀', 4100, 5),
  ('Coach Carl', '🧲', 3800, 5),
  ('Nina S.', '🧲', 3600, 5),
  ('The Optimizer', '🧲', 3400, 5),
  ('Joy M.', '🧲', 3200, 5),
  ('Dani P.', '🧲', 3000, 5),
  ('Rhea L.', '🧲', 2800, 5),
  ('Karlo V.', '📈', 2600, 4),
  ('Sweet_VA', '📈', 2450, 4),
  ('Miguel A.', '📈', 2300, 4),
  ('Tina W.', '📈', 2150, 4),
  ('Josh R.', '📈', 2000, 4),
  ('Faith D.', '📈', 1850, 4),
  ('Ella C.', '🌱', 1700, 3),
  ('Renz M.', '🌱', 1600, 3),
  ('Carla B.', '🌱', 1500, 3),
  ('Ian T.', '🌱', 1400, 3),
  ('Gigi A.', '🌱', 1300, 3),
  ('Sam K.', '🌱', 1200, 3),
  ('Liza Q.', '🌱', 1100, 3),
  ('Bianca F.', '🥔', 1000, 2),
  ('Marco D.', '🥔', 900, 2),
  ('Shane O.', '🥔', 800, 2),
  ('Yna P.', '🥔', 700, 2),
  ('Kurt J.', '🥔', 600, 2),
  ('Rose V.', '🥔', 500, 2),
  ('Paul E.', '🥔', 400, 2),
  ('May C.', '🥔', 300, 2),
  ('Ace N.', '🐣', 250, 1),
  ('Chesca M.', '🐣', 200, 1),
  ('Drei L.', '🐣', 150, 1),
  ('Nikki B.', '🐣', 100, 1),
  ('Vic S.', '🐣', 75, 1),
  ('Joan R.', '🐣', 50, 1),
  ('Abby K.', '🐣', 25, 1)
on conflict do nothing;
