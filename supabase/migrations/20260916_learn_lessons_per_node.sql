-- =============================================================
-- Sari Learn — 4 sub-lessons per skill node (Duolingo-style
-- "Lesson X of 4"). Each node already has Mission 1; add 2-4.
-- ASCII-safe U& strings.
-- =============================================================

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
cross join generate_series(2, 4) as g(i)
where not exists (
  select 1 from learn_levels l where l.node_id = n.id and l.order_index = g.i
);