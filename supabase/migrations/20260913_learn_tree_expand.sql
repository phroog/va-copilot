-- =============================================================
-- Sari Learn — expand skill trees with depth-3 leaf skills
-- (runs after 20260912_learn_engine.sql). ASCII-safe U& strings.
-- =============================================================

with p as (select id, slug from va_paths)
insert into skill_nodes (path_id, parent_id, title, subtitle, emoji, depth, order_index, unlocks_tool, xp_reward)
select
  p.id,
  null,
  n.title, n.subtitle, n.emoji, 3, n.order_index, null, 180
from (values
  -- Social Media VA
  ('social-media-va', 'Content Calendars', 'Plan posts ahead so content never runs out', U&'\+01F5D3\FE0F', 1),
  ('social-media-va', 'Reporting to Clients', 'Turn engagement into clean client reports', U&'\+01F4CA', 2),
  ('social-media-va', 'Comments & DMs', 'Reply fast and keep the vibe friendly', U&'\+01F4AC', 3),
  ('social-media-va', 'Crisis & Trolling', 'Stay calm when things go wrong online', U&'\+01F6DF', 4),
  -- Executive Assistant
  ('executive-assistant', 'Itinerary Building', 'Build clear, day-by-day trip plans', U&'\+01F5FA\FE0F', 1),
  ('executive-assistant', 'Booking Support', 'Flights, hotels and backup plans done right', U&'\2708\FE0F', 2),
  ('executive-assistant', 'Meeting Notes', 'Turn rambling calls into clear action items', U&'\+01F4DD', 3),
  ('executive-assistant', 'Client Dashboards', 'Status reports clients love to read', U&'\+01F4C8', 4),
  -- E-commerce VA
  ('ecommerce-va', 'Returns & Refunds', 'Handle returns fast without losing trust', U&'\21A9\FE0F', 1),
  ('ecommerce-va', 'Reviews & Ratings', 'Win 5-star reviews and fix bad ones', U&'\2B50', 2),
  ('ecommerce-va', 'Sales Dashboards', 'Read daily sales and spot trends', U&'\+01F4CA', 3),
  ('ecommerce-va', 'Inventory Alerts', 'Never run out of bestsellers', U&'\+01F4E6', 4),
  -- Real Estate VA
  ('real-estate-va', 'Closing Checklists', 'Keep every deadline on the closing list', U&'\2705', 1),
  ('real-estate-va', 'Document Packing', 'Collect and organize every signed doc', U&'\+01F5C2\FE0F', 2),
  ('real-estate-va', 'Social Content for Agents', 'Post listings that get views and leads', U&'\+01F4F1', 3),
  ('real-estate-va', 'Email Campaigns', 'Nurture leads with simple email sequences', U&'\2709\FE0F', 4),
  -- Bookkeeping VA
  ('bookkeeping-va', 'Bank Reconciliations', 'Match every transaction to the statement', U&'\+01F3E6', 1),
  ('bookkeeping-va', 'Card Reconciliations', 'Catch missing and duplicate charges', U&'\+01F4B3', 2),
  ('bookkeeping-va', 'P&L Reports', 'Explain profit and loss in plain words', U&'\+01F4CA', 3),
  ('bookkeeping-va', 'Tax Prep Support', 'Organize the books so tax season is easy', U&'\+01F9FE', 4),
  -- General VA
  ('general-va', 'Deep Research', 'Find answers clients trust, fast', U&'\+01F50E', 1),
  ('general-va', 'Vendor Sourcing', 'Find and vet suppliers and freelancers', U&'\+01F6D2', 2),
  ('general-va', 'Scope & Boundaries', 'Set clear expectations from day one', U&'\+01F6A7', 3),
  ('general-va', 'Handling Difficult Clients', 'Turn friction into professionalism', U&'\+01F4AA', 4)
) as n(slug, title, subtitle, emoji, order_index)
join p on p.slug = n.slug;

-- Link depth-3 nodes to their depth-2 parents (order 1,2 -> branch 1; order 3,4 -> branch 2).
do $$
declare
  pid uuid;
  b1 uuid;
  b2 uuid;
begin
  for pid in select id from va_paths loop
    select id into b1 from skill_nodes where path_id = pid and depth = 2 and order_index = 1 limit 1;
    select id into b2 from skill_nodes where path_id = pid and depth = 2 and order_index = 2 limit 1;
    update skill_nodes set parent_id = b1 where path_id = pid and depth = 3 and order_index in (1, 2);
    update skill_nodes set parent_id = b2 where path_id = pid and depth = 3 and order_index in (3, 4);
  end loop;
end $$;

-- Seed one level (lesson) for each new node.
insert into learn_levels (node_id, title, subtitle, order_index, xp_reward, duration_minutes, seed_key)
select
  n.id,
  n.title || U&' \00B7 Mission 1',
  n.subtitle,
  1,
  n.xp_reward,
  3,
  'level:' || n.id::text
from skill_nodes n
where n.depth = 3;