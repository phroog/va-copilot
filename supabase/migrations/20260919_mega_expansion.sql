-- =============================================================
-- Sari Learn — MEGA expansion: 12 new VA categories + giant paths.
-- Every path grows to ~225 levels (base + tiers 2-28).
-- =============================================================

-- 1. New categories
insert into va_paths (slug, title, subtitle, description, emoji, color, order_index) values
  ('copywriting-va', 'Copywriting VA', 'Write words that sell', 'Email, ads, blogs and landing pages that turn readers into buyers.', '✍️', 'from-kawaii-purple to-kawaii-pink', 7),
  ('email-marketing-va', 'Email Marketing VA', 'Turn lists into revenue', 'Grow lists, write emails and run automations clients love.', '📧', 'from-kawaii-purple to-kawaii-lavender', 8),
  ('seo-va', 'SEO VA', 'Get clients found on Google', 'Keyword research, on-page fixes and content that actually ranks.', '🔍', 'from-kawaii-lavender to-kawaii-purple', 9),
  ('customer-support-va', 'Customer Support VA', 'Keep customers happy', 'Chat, email, tickets and reviews — the friendly front line.', '💬', 'from-kawaii-coral to-kawaii-pink', 10),
  ('data-entry-va', 'Data Entry VA', 'Fast, accurate, organized', 'Typing, spreadsheets, cleaning and managing data with care.', '🗂️', 'from-kawaii-mint to-kawaii-purple', 11),
  ('hr-recruitment-va', 'HR & Recruitment VA', 'Hire the best behind the scenes', 'Sourcing, screening, onboarding and HR admin support.', '👥', 'from-kawaii-purple to-kawaii-coral', 12),
  ('project-management-va', 'Project Mgmt VA', 'Keep projects on track', 'Tasks, tools, teams and reporting — the organiser clients rely on.', '📋', 'from-kawaii-lavender to-kawaii-mint', 13),
  ('web-wordpress-va', 'Web & WordPress VA', 'Build and maintain websites', 'WordPress, page builders, plugins, updates and site care.', '🌐', 'from-kawaii-purple to-kawaii-peach', 14),
  ('video-editing-va', 'Video Editing VA', 'Edit content that pops', 'Cuts, captions, social clips and motion for creators.', '🎬', 'from-kawaii-pink to-kawaii-coral', 15),
  ('legal-va', 'Legal VA', 'Support law firms', 'Research, drafting, filing and calendars for legal teams.', '⚖️', 'from-kawaii-purple to-kawaii-peach', 16),
  ('lead-generation-va', 'Lead Gen VA', 'Fill the pipeline', 'Prospects, outreach, lists and CRM hygiene that grow deals.', '🎯', 'from-kawaii-coral to-kawaii-lavender', 17),
  ('ai-automation-va', 'AI & Automation VA', 'Automate the boring stuff', 'Prompts, chatbots and workflows that save hours every week.', '🤖', 'from-kawaii-purple to-kawaii-mint', 18)
on conflict (slug) do nothing;

-- 2. Base skill nodes for the new paths
with p as (select id, slug from va_paths)
insert into skill_nodes (path_id, parent_id, title, subtitle, emoji, depth, order_index, xp_reward)
select p.id, null, n.title, n.subtitle, n.emoji, n.depth, n.order_index, 100
from (values
  -- Copywriting VA
  ('copywriting-va', 'Copywriting Foundations', 'The craft behind words that sell', '✍️', 0, 1),
  ('copywriting-va', 'Voice & Brand', 'Write in any client voice', '🎙️', 1, 1),
  ('copywriting-va', 'Email Copy', 'Emails people actually open', '📧', 1, 2),
  ('copywriting-va', 'Ad Copy', 'Ads that convert', '📣', 2, 1),
  ('copywriting-va', 'Blog & SEO Copy', 'Content that ranks', '✍️', 2, 2),
  ('copywriting-va', 'Landing Pages', 'Pages that sell', '🚀', 3, 1),
  ('copywriting-va', 'Social Copy', 'Posts that stop the scroll', '📱', 3, 2),
  ('copywriting-va', 'Editing & Proofing', 'Polish every word', '🧐', 3, 3),
  ('copywriting-va', 'Sales Copy', 'Turn readers into buyers', '💰', 3, 4),
  -- Email Marketing VA
  ('email-marketing-va', 'Email Marketing Foundations', 'The engine behind loyal lists', '📧', 0, 1),
  ('email-marketing-va', 'List Building', 'Grow a quality list', '📇', 1, 1),
  ('email-marketing-va', 'Newsletter Design', 'Newsletters that get read', '🎨', 1, 2),
  ('email-marketing-va', 'Drip Campaigns', 'Automate the journey', '💧', 2, 1),
  ('email-marketing-va', 'Segmentation', 'Send the right message', '🗂️', 2, 2),
  ('email-marketing-va', 'Deliverability', 'Land in the inbox', '📬', 3, 1),
  ('email-marketing-va', 'A/B Testing', 'Test and improve', '🧪', 3, 2),
  ('email-marketing-va', 'Analytics & Reports', 'Show real results', '📊', 3, 3),
  ('email-marketing-va', 'Automation Setup', 'Set it and forget it', '⚙️', 3, 4),
  -- SEO VA
  ('seo-va', 'SEO Foundations', 'The rules of getting found', '🔍', 0, 1),
  ('seo-va', 'Keyword Research', 'Find the winning keywords', '🔑', 1, 1),
  ('seo-va', 'On-Page SEO', 'Optimize every page', '📄', 1, 2),
  ('seo-va', 'Content SEO', 'Content that ranks', '✍️', 2, 1),
  ('seo-va', 'Technical SEO', 'Fix the tech basics', '🛠️', 2, 2),
  ('seo-va', 'Link Building', 'Earn quality links', '🔗', 3, 1),
  ('seo-va', 'Local SEO', 'Win local searches', '📍', 3, 2),
  ('seo-va', 'SEO Audits', 'Find and fix issues', '🔎', 3, 3),
  ('seo-va', 'Rank Tracking', 'Track and report', '📈', 3, 4),
  -- Customer Support VA
  ('customer-support-va', 'Support Foundations', 'The friendly front line', '💬', 0, 1),
  ('customer-support-va', 'Live Chat', 'Handle chat fast', '💬', 1, 1),
  ('customer-support-va', 'Email Support', 'Emails that solve', '📧', 1, 2),
  ('customer-support-va', 'Tickets & Escalation', 'Manage the queue', '🎫', 2, 1),
  ('customer-support-va', 'Returns & Refunds', 'Handle refunds well', '↩️', 2, 2),
  ('customer-support-va', 'FAQ & Knowledge Base', 'Answer once, scale', '📚', 3, 1),
  ('customer-support-va', 'CSAT & Reviews', 'Win 5-star reviews', '⭐', 3, 2),
  ('customer-support-va', 'Difficult Customers', 'Stay calm and firm', '🧊', 3, 3),
  ('customer-support-va', 'New Client Onboarding', 'Set the tone early', '🤝', 3, 4),
  -- Data Entry VA
  ('data-entry-va', 'Data Foundations', 'Where order begins', '🗂️', 0, 1),
  ('data-entry-va', 'Typing & Accuracy', 'Speed with zero errors', '⌨️', 1, 1),
  ('data-entry-va', 'Spreadsheet Skills', 'Excel and Sheets mastery', '📊', 1, 2),
  ('data-entry-va', 'Data Cleaning', 'Clean, consistent data', '🧹', 2, 1),
  ('data-entry-va', 'Database Management', 'Keep data organized', '🗃️', 2, 2),
  ('data-entry-va', 'OCR & Digitizing', 'Turn docs into data', '🖨️', 3, 1),
  ('data-entry-va', 'Data Validation', 'Catch the errors', '✅', 3, 2),
  ('data-entry-va', 'Reports & Dashboards', 'Present data clearly', '📉', 3, 3),
  ('data-entry-va', 'Data Privacy', 'Handle data safely', '🔒', 3, 4),
  -- HR & Recruitment VA
  ('hr-recruitment-va', 'HR Foundations', 'People ops, handled', '👥', 0, 1),
  ('hr-recruitment-va', 'Sourcing Candidates', 'Find great talent', '🔎', 1, 1),
  ('hr-recruitment-va', 'Screening & Interviewing', 'Spot the best', '🎤', 1, 2),
  ('hr-recruitment-va', 'Job Postings', 'Write ads that work', '📢', 2, 1),
  ('hr-recruitment-va', 'Onboarding Docs', 'Welcome new hires', '📋', 2, 2),
  ('hr-recruitment-va', 'Payroll Support', 'Help with payroll', '💰', 3, 1),
  ('hr-recruitment-va', 'Employee Records', 'Keep records clean', '🗂️', 3, 2),
  ('hr-recruitment-va', 'Background Checks', 'Verify candidates', '🕵️', 3, 3),
  ('hr-recruitment-va', 'HR Compliance', 'Stay compliant', '⚖️', 3, 4),
  -- Project Management VA
  ('project-management-va', 'PM Foundations', 'The art of getting things done', '📋', 0, 1),
  ('project-management-va', 'Task Tracking', 'Track everything', '✅', 1, 1),
  ('project-management-va', 'Asana & Trello', 'Master PM tools', '🗂️', 1, 2),
  ('project-management-va', 'Team Coordination', 'Keep everyone in sync', '🤝', 2, 1),
  ('project-management-va', 'Client Reporting', 'Reports clients love', '📊', 2, 2),
  ('project-management-va', 'Scheduling', 'Plan it all', '📅', 3, 1),
  ('project-management-va', 'Risk & Issues', 'Catch problems early', '⚠️', 3, 2),
  ('project-management-va', 'Process Docs', 'Document the way', '📄', 3, 3),
  ('project-management-va', 'Resource Planning', 'Plan capacity', '🧩', 3, 4),
  -- Web & WordPress VA
  ('web-wordpress-va', 'Web Foundations', 'Websites that just work', '🌐', 0, 1),
  ('web-wordpress-va', 'WordPress Basics', 'Know the CMS', '🌐', 1, 1),
  ('web-wordpress-va', 'Page Builders', 'Build pages visually', '🧱', 1, 2),
  ('web-wordpress-va', 'Plugins & Updates', 'Keep it maintained', '🔌', 2, 1),
  ('web-wordpress-va', 'Content Uploads', 'Publish content fast', '📤', 2, 2),
  ('web-wordpress-va', 'Forms & Integrations', 'Connect the tools', '🔗', 3, 1),
  ('web-wordpress-va', 'Site Speed', 'Make it fast', '⚡', 3, 2),
  ('web-wordpress-va', 'Security Basics', 'Keep it safe', '🔒', 3, 3),
  ('web-wordpress-va', 'Website Audits', 'Find and fix issues', '🔎', 3, 4),
  -- Video Editing VA
  ('video-editing-va', 'Video Foundations', 'Content that keeps eyes on', '🎬', 0, 1),
  ('video-editing-va', 'Cutting & Trimming', 'Clean cuts', '✂️', 1, 1),
  ('video-editing-va', 'Transitions & B-Roll', 'Keep it flowing', '🎞️', 1, 2),
  ('video-editing-va', 'Captions & Subtitles', 'Captions that engage', '💬', 2, 1),
  ('video-editing-va', 'Social Clips', 'Reels and Shorts', '📱', 2, 2),
  ('video-editing-va', 'Color & Audio', 'Look and sound great', '🎨', 3, 1),
  ('video-editing-va', 'Motion Graphics', 'Add motion', '🌀', 3, 2),
  ('video-editing-va', 'Export & Delivery', 'Deliver correctly', '📦', 3, 3),
  ('video-editing-va', 'Thumbnails', 'Thumbnails that click', '🖼️', 3, 4),
  -- Legal VA
  ('legal-va', 'Legal Foundations', 'Precision behind the scenes', '⚖️', 0, 1),
  ('legal-va', 'Legal Research', 'Find the answers', '🔎', 1, 1),
  ('legal-va', 'Drafting Basics', 'Draft documents', '📝', 1, 2),
  ('legal-va', 'Contract Review', 'Spot the issues', '📑', 2, 1),
  ('legal-va', 'Filing & Docs', 'File everything right', '📁', 2, 2),
  ('legal-va', 'Court Calendars', 'Never miss a date', '📅', 3, 1),
  ('legal-va', 'Client Intake', 'Take on clients', '🤝', 3, 2),
  ('legal-va', 'Billing Support', 'Handle billing', '💰', 3, 3),
  ('legal-va', 'Confidentiality', 'Protect the secrets', '🔒', 3, 4),
  -- Lead Generation VA
  ('lead-generation-va', 'Lead Gen Foundations', 'A pipeline that never dries up', '🎯', 0, 1),
  ('lead-generation-va', 'Prospect Research', 'Find the right prospects', '🔎', 1, 1),
  ('lead-generation-va', 'LinkedIn Outreach', 'Connect and convert', '💼', 1, 2),
  ('lead-generation-va', 'Email Prospecting', 'Cold emails that work', '📧', 2, 1),
  ('lead-generation-va', 'List Building', 'Build target lists', '📇', 2, 2),
  ('lead-generation-va', 'Lead Scoring', 'Rank the leads', '🎯', 3, 1),
  ('lead-generation-va', 'CRM Updates', 'Keep the CRM clean', '🗂️', 3, 2),
  ('lead-generation-va', 'Follow-up Systems', 'Never drop a lead', '⏰', 3, 3),
  ('lead-generation-va', 'Reporting', 'Show the pipeline', '📊', 3, 4),
  -- AI & Automation VA
  ('ai-automation-va', 'AI Foundations', 'Work smarter with AI', '🤖', 0, 1),
  ('ai-automation-va', 'Prompting Basics', 'Talk to AI well', '💬', 1, 1),
  ('ai-automation-va', 'AI Content', 'Create content with AI', '✍️', 1, 2),
  ('ai-automation-va', 'Chatbots', 'Set up chatbots', '🤖', 2, 1),
  ('ai-automation-va', 'Workflow Automation', 'Zapier and more', '⚙️', 2, 2),
  ('ai-automation-va', 'AI Tools Directory', 'Know the tools', '🧰', 3, 1),
  ('ai-automation-va', 'AI Data & Sheets', 'AI in spreadsheets', '📊', 3, 2),
  ('ai-automation-va', 'Quality Review', 'Check AI output', '✅', 3, 3),
  ('ai-automation-va', 'Prompt Libraries', 'Reuse great prompts', '📚', 3, 4)
) as n(slug, title, subtitle, emoji, depth, order_index)
join p on p.slug = n.slug;

-- 3. Attach parents for the new paths
do $$
declare pid uuid; root uuid;
begin
  for pid in select id from va_paths where slug in ('copywriting-va','email-marketing-va','seo-va','customer-support-va','data-entry-va','hr-recruitment-va','project-management-va','web-wordpress-va','video-editing-va','legal-va','lead-generation-va','ai-automation-va') loop
    select id into root from skill_nodes where path_id = pid and depth = 0 limit 1;
    if root is not null then
      update skill_nodes set parent_id = root where path_id = pid and depth = 1;
      update skill_nodes set parent_id = (select id from skill_nodes where path_id = pid and depth = 1 and order_index = 1 limit 1) where path_id = pid and depth = 2 and order_index = 1;
      update skill_nodes set parent_id = (select id from skill_nodes where path_id = pid and depth = 1 and order_index = 2 limit 1) where path_id = pid and depth = 2 and order_index = 2;
      update skill_nodes set parent_id = (select id from skill_nodes where path_id = pid and depth = 2 and order_index = 1 limit 1) where path_id = pid and depth = 3 and order_index in (1, 2);
      update skill_nodes set parent_id = (select id from skill_nodes where path_id = pid and depth = 2 and order_index = 2 limit 1) where path_id = pid and depth = 3 and order_index in (3, 4);
    end if;
  end loop;
end $$;

-- 4. Giant tier expansion (Tiers 6-28) for EVERY base skill in every path
with base as (
  select id, path_id, title, subtitle, emoji,
         row_number() over (partition by path_id order by depth, order_index) as base_pos
  from skill_nodes
  where depth between 1 and 3
)
insert into skill_nodes (path_id, parent_id, title, subtitle, emoji, depth, order_index, xp_reward)
select b.path_id, b.id, b.title || U&' \00B7 Tier ' || g.t, b.subtitle, b.emoji, 4, 1000 + b.base_pos * 100 + g.t, 200
from base b
cross join generate_series(6, 28) as g(t);

-- 5. Ensure every skill node has exactly 4 lessons
insert into learn_levels (node_id, title, subtitle, order_index, xp_reward, duration_minutes, seed_key)
select n.id, n.title || U&' \00B7 Mission ' || g.i, n.subtitle, g.i, n.xp_reward, 3, 'level:' || n.id::text || ':' || g.i
from skill_nodes n
cross join generate_series(1, 4) as g(i)
where not exists (select 1 from learn_levels l where l.node_id = n.id and l.order_index = g.i);