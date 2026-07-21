CREATE TYPE academy_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert', 'business');

CREATE TABLE IF NOT EXISTS academy_masterclasses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  video_url TEXT DEFAULT '',
  level academy_level NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  duration_minutes INT DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS academy_quizzes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  masterclass_id UUID REFERENCES academy_masterclasses(id) ON DELETE CASCADE NOT NULL,
  question_data JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS academy_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  masterclass_id UUID REFERENCES academy_masterclasses(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN DEFAULT false,
  quiz_score NUMERIC DEFAULT NULL,
  completed_at TIMESTAMPTZ DEFAULT NULL,
  UNIQUE(user_id, masterclass_id)
);

ALTER TABLE academy_masterclasses ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view masterclasses"
  ON academy_masterclasses FOR SELECT USING (true);
CREATE POLICY "Anyone can view quizzes"
  ON academy_quizzes FOR SELECT USING (true);
CREATE POLICY "Users can view own progress"
  ON academy_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress"
  ON academy_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress"
  ON academy_progress FOR UPDATE USING (auth.uid() = user_id);

-- Seed data
INSERT INTO academy_masterclasses (title, description, video_url, level, order_index, duration_minutes) VALUES
('Finding Your Niche as a VA', 'Learn how to identify your unique skills and match them with in-demand VA services. Discover which niche is most profitable for you.', '', 'beginner', 1, 12),
('Setting Up Your Services & Pricing', 'How to structure your service packages, set competitive rates, and communicate value to clients.', '', 'beginner', 2, 15),
('Creating a Winning Profile', 'Craft a compelling VA profile that attracts clients. Cover bios, portfolios, and platform optimization.', '', 'beginner', 3, 10),
('Writing Proposals That Get Responses', 'Master the art of proposal writing. Templates, personalization, and follow-up strategies that work.', '', 'intermediate', 1, 14),
('Client Communication 101', 'Professional email etiquette, setting boundaries, managing expectations, and handling difficult conversations.', '', 'intermediate', 2, 12),
('Time Management for VAs', 'Tools and techniques to manage multiple clients, deadlines, and your own productivity effectively.', '', 'intermediate', 3, 11),
('Advanced Email & Calendar Management', 'Zero-inbox strategies, scheduling best practices, and tools to manage complex calendars.', '', 'advanced', 1, 13),
('Social Media Management for Clients', 'Plan, create, and schedule content. Understand analytics and reporting for client accounts.', '', 'advanced', 2, 15),
('Using VA Copilot Tools', 'Hands-on walkthrough of time tracking, invoicing, client portals, and the vault inside VA Copilot.', '', 'advanced', 3, 10),
('Scaling Your VA Business', 'When and how to raise rates, add services, and transition from freelancer to business owner.', '', 'expert', 1, 14),
('Building a Personal Brand', 'Establish yourself as an authority. LinkedIn optimization, testimonials, and networking strategies.', '', 'expert', 2, 12),
('Automating Your Workflow', 'Tools and systems to automate repetitive tasks, freeing up time for higher-value work.', '', 'expert', 3, 11),
('Hiring & Managing Sub-VAs', 'How to find, train, and manage a team of VAs. Delegation, quality control, and team culture.', '', 'business', 1, 15),
('Creating Passive Income Streams', 'Digital products, templates, courses, and affiliate income sources for established VAs.', '', 'business', 2, 12),
('Building a VA Agency', 'Step-by-step guide to launching and scaling a multi-VA agency with systems and processes.', '', 'business', 3, 14);

-- Seed quizzes
DO $$
DECLARE
  mc_id UUID;
BEGIN
  -- Quiz for "Finding Your Niche"
  SELECT id INTO mc_id FROM academy_masterclasses WHERE title LIKE 'Finding Your Niche%' LIMIT 1;
  INSERT INTO academy_quizzes (masterclass_id, question_data) VALUES (mc_id, '[{"question":"What is the first step in finding your VA niche?","options":["Pick the highest-paying niche","Identify your existing skills and interests","Copy what other VAs are doing","Choose randomly"],"correctIndex":1},{"question":"Why is niching down important for VAs?","options":["It limits your income","It makes you the go-to expert","It is easier to find any job","Clients prefer generalists"],"correctIndex":1},{"question":"Which of these is a profitable VA niche?","options":["Social media management","Cold calling only","Data entry only","None of the above"],"correctIndex":0}]');

  -- Quiz for "Setting Up Services & Pricing"
  SELECT id INTO mc_id FROM academy_masterclasses WHERE title LIKE 'Setting Up Your Services%' LIMIT 1;
  INSERT INTO academy_quizzes (masterclass_id, question_data) VALUES (mc_id, '[{"question":"What should you consider when setting your hourly rate?","options":["Your experience and value","The lowest rate on Upwork","What your friends charge","Always $5/hour"],"correctIndex":0},{"question":"What is a service package?","options":["A single task you offer","A bundle of services at a set price","A discount coupon","A free trial"],"correctIndex":1},{"question":"How often should you review your pricing?","options":["Never","Every 6-12 months","Only when a client complains","Once a year is enough"],"correctIndex":1}]');

  -- Quiz for "Creating a Winning Profile"
  SELECT id INTO mc_id FROM academy_masterclasses WHERE title LIKE 'Creating a Winning Profile%' LIMIT 1;
  INSERT INTO academy_quizzes (masterclass_id, question_data) VALUES (mc_id, '[{"question":"What is the most important part of your VA profile?","options":["Your photo","Your headline and summary","Your hourly rate","Your location"],"correctIndex":1},{"question":"Should you include client testimonials?","options":["Yes, they build trust","No, they are unprofessional","Only if asked","Testimonials do not matter"],"correctIndex":0},{"question":"What tone should your profile have?","options":["Very formal and technical","Professional but approachable","Casual and informal","Sarcastic"],"correctIndex":1}]');

  -- Quiz for "Writing Proposals"
  SELECT id INTO mc_id FROM academy_masterclasses WHERE title LIKE 'Writing Proposals%' LIMIT 1;
  INSERT INTO academy_quizzes (masterclass_id, question_data) VALUES (mc_id, '[{"question":"What is the key to a winning proposal?","options":["Making it as long as possible","Copy-pasting the same template","Personalizing it to the client","Listing all your skills"],"correctIndex":2},{"question":"How should you start a proposal?","options":["With your rate","With a generic greeting","By referencing the client project","With your resume"],"correctIndex":2},{"question":"What should you include in every proposal?","options":["Your portfolio link","A clear call to action","Relevant experience","All of the above"],"correctIndex":3}]');

  -- Quiz for "Client Communication"
  SELECT id INTO mc_id FROM academy_masterclasses WHERE title LIKE 'Client Communication%' LIMIT 1;
  INSERT INTO academy_quizzes (masterclass_id, question_data) VALUES (mc_id, '[{"question":"How quickly should you respond to client messages?","options":["Within 24 hours on business days","Immediately, even at 2 AM","Within a week","Only when you feel like it"],"correctIndex":0},{"question":"What is the best way to handle scope creep?","options":["Ignore it","Politely refer to the original agreement","Do extra work for free","Quit the project"],"correctIndex":1},{"question":"What should you do if you miss a deadline?","options":["Hide it and work faster","Blame the client","Communicate early and propose a solution","Ignore it"],"correctIndex":2}]');

  -- Quiz for "Time Management"
  SELECT id INTO mc_id FROM academy_masterclasses WHERE title LIKE 'Time Management%' LIMIT 1;
  INSERT INTO academy_quizzes (masterclass_id, question_data) VALUES (mc_id, '[{"question":"What is the Pomodoro Technique?","options":["Working 25 min then 5 min break","Working until finished","Taking a nap","Checking email all day"],"correctIndex":0},{"question":"Which tool helps with time tracking?","options":["VA Copilot Timer","A notebook","A calendar","All of the above can work"],"correctIndex":3},{"question":"How should you prioritize tasks?","options":["By how fun they are","By urgency and importance","First-come first-served","Randomly"],"correctIndex":1}]');

  -- Quiz for "Advanced Email & Calendar"
  SELECT id INTO mc_id FROM academy_masterclasses WHERE title LIKE 'Advanced Email%' LIMIT 1;
  INSERT INTO academy_quizzes (masterclass_id, question_data) VALUES (mc_id, '[{"question":"What is Inbox Zero?","options":["Deleting all emails","Processing all emails to completion","Having zero unread emails","Both B and C"],"correctIndex":3},{"question":"What is calendar blocking?","options":["Blocking spam emails","Reserving time blocks for specific tasks","Canceling all meetings","A workout technique"],"correctIndex":1},{"question":"How should you handle meeting scheduling?","options":["Email back and forth 10 times","Use a scheduling tool like Calendly","Pick a random time","Let the client guess"],"correctIndex":1}]');

  -- Quiz for "Social Media Management"
  SELECT id INTO mc_id FROM academy_masterclasses WHERE title LIKE 'Social Media Management%' LIMIT 1;
  INSERT INTO academy_quizzes (masterclass_id, question_data) VALUES (mc_id, '[{"question":"What is a content calendar?","options":["A birthday calendar","A schedule of planned posts","A list of holidays","A photo album"],"correctIndex":1},{"question":"Which metric shows engagement?","options":["Follower count","Likes and comments","Number of DMs","Profile views"],"correctIndex":1},{"question":"How often should you post for clients?","options":["Once a month","Consistently (e.g., 3-5x per week)","Every hour","Only on weekends"],"correctIndex":1}]');

  -- Quiz for "Using VA Copilot Tools"
  SELECT id INTO mc_id FROM academy_masterclasses WHERE title LIKE 'Using VA Copilot%' LIMIT 1;
  INSERT INTO academy_quizzes (masterclass_id, question_data) VALUES (mc_id, '[{"question":"What does the VA Copilot Timer do?","options":["Tracks time spent on tasks","Sends emails","Designs logos","Manages social media"],"correctIndex":0},{"question":"Where can you store client passwords securely?","options":["In a text file","In the VA Copilot Vault","In an email draft","In your browser"],"correctIndex":1},{"question":"What is the Inbox feature for?","options":["Playing games","Managing platform messages in one place","Sending newsletters","Video calls"],"correctIndex":1}]');

  -- Quiz for "Scaling Your Business"
  SELECT id INTO mc_id FROM academy_masterclasses WHERE title LIKE 'Scaling Your VA%' LIMIT 1;
  INSERT INTO academy_quizzes (masterclass_id, question_data) VALUES (mc_id, '[{"question":"When should you consider raising your rates?","options":["When you have more clients than you can handle","Never","Only after a year","When clients complain"],"correctIndex":0},{"question":"What is the biggest sign you should scale?","options":["You are bored","You have a waiting list of clients","You have no work","Your rates are the lowest"],"correctIndex":1},{"question":"What should you do before scaling?","options":["Quit your current clients","Systematize your processes","Hire 10 people","Build a website"],"correctIndex":1}]');

  -- Quiz for "Building a Personal Brand"
  SELECT id INTO mc_id FROM academy_masterclasses WHERE title LIKE 'Building a Personal Brand%' LIMIT 1;
  INSERT INTO academy_quizzes (masterclass_id, question_data) VALUES (mc_id, '[{"question":"What is personal branding?","options":["Having a nice logo","How you present yourself to the world","Your hourly rate","Your email signature"],"correctIndex":1},{"question":"Which platform is best for VA networking?","options":["TikTok","LinkedIn","Snapchat","MySpace"],"correctIndex":1},{"question":"How do you build credibility?","options":["Share client results and testimonials","Post daily selfies","Argue in comments","Stay invisible"],"correctIndex":0}]');

  -- Quiz for "Automating Your Workflow"
  SELECT id INTO mc_id FROM academy_masterclasses WHERE title LIKE 'Automating Your Workflow%' LIMIT 1;
  INSERT INTO academy_quizzes (masterclass_id, question_data) VALUES (mc_id, '[{"question":"What is workflow automation?","options":["Hiring more people","Using tools to handle repetitive tasks","Working faster","Ignoring small tasks"],"correctIndex":1},{"question":"Which task is easiest to automate?","options":["Client strategy meetings","Email sorting and filtering","Creative design","Negotiations"],"correctIndex":1},{"question":"What is a benefit of automation?","options":["More free time","Fewer errors","Consistent output","All of the above"],"correctIndex":3}]');

  -- Quiz for "Hiring Sub-VAs"
  SELECT id INTO mc_id FROM academy_masterclasses WHERE title LIKE 'Hiring & Managing%' LIMIT 1;
  INSERT INTO academy_quizzes (masterclass_id, question_data) VALUES (mc_id, '[{"question":"What should you look for in a sub-VA?","options":["Lowest price","Reliability and relevant skills","Number of certifications","Same timezone only"],"correctIndex":1},{"question":"How should you train a sub-VA?","options":["Give them full access immediately","Create clear SOPs and guidelines","Let them figure it out","Micromanage every task"],"correctIndex":1},{"question":"What is the key to managing a team?","options":["Clear communication","Weekly check-ins","Documented processes","All of the above"],"correctIndex":3}]');

  -- Quiz for "Passive Income"
  SELECT id INTO mc_id FROM academy_masterclasses WHERE title LIKE 'Creating Passive Income%' LIMIT 1;
  INSERT INTO academy_quizzes (masterclass_id, question_data) VALUES (mc_id, '[{"question":"What is passive income?","options":["Money earned with little ongoing effort","Winning the lottery","Working 80 hours a week","Asking for raises"],"correctIndex":0},{"question":"Which is an example of passive income for VAs?","options":["Selling templates and digital products","Hourly client work","Data entry","Cold calling"],"correctIndex":0},{"question":"How much upfront work do passive products need?","options":["None, they create themselves","Significant initial effort","Just an idea","A few minutes"],"correctIndex":1}]');

  -- Quiz for "Building a VA Agency"
  SELECT id INTO mc_id FROM academy_masterclasses WHERE title LIKE 'Building a VA Agency%' LIMIT 1;
  INSERT INTO academy_quizzes (masterclass_id, question_data) VALUES (mc_id, '[{"question":"What is the first step to building an agency?","options":["Register a company","Get your first client and systemize delivery","Build a fancy website","Hire 20 VAs"],"correctIndex":1},{"question":"How do agency owners differ from freelancers?","options":["They work more hours","They leverage a team to scale","They charge less","They have no clients"],"correctIndex":1},{"question":"What is crucial for agency success?","options":["Systems and processes","A big office","Expensive software","A large team from day one"],"correctIndex":0}]');

END $$;
