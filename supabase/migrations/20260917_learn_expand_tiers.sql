-- =============================================================
-- Sari Learn — expand every path with 4 progression tiers per
-- skill (9 skills -> ~41 levels per path) and ensure every skill
-- node has 4 lessons. ASCII-safe U& strings.
-- =============================================================

-- 1. Tier nodes (Tier 2-5) as children of their base skill.
with base as (
  select id, path_id, title, subtitle, emoji, depth,
         row_number() over (partition by path_id order by depth, order_index) as base_pos
  from skill_nodes
  where depth between 1 and 3
)
insert into skill_nodes (path_id, parent_id, title, subtitle, emoji, depth, order_index, xp_reward)
select
  b.path_id,
  b.id,
  b.title || U&' \00B7 Tier ' || g.t,
  b.subtitle,
  b.emoji,
  4,
  (b.base_pos - 1) * 10 + g.t,
  180
from base b
cross join generate_series(2, 5) as g(t);

-- 2. Ensure every skill node has exactly 4 lessons.
insert into learn_levels (node_id, title, subtitle, order_index, xp_reward, duration_minutes, seed_key)
select
  n.id,
  n.title || U&' \00B7 Mission ' || g.i,
  n.subtitle,
  g.i,
  n.xp_reward,
  3,
  'level:' || n.id::text || ':' || g.i
from skill_nodes n
cross join generate_series(1, 4) as g(i)
where not exists (
  select 1 from learn_levels l where l.node_id = n.id and l.order_index = g.i
);