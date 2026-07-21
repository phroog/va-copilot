import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const sampleMessages = [
  {
    from_address: "upwork@notification.upwork.com",
    subject: "New proposal for your job: Website Redesign",
    body: "Hello! I'm a web developer with 5+ years of experience. I've reviewed your project and I'm confident I can deliver exceptional results. My approach combines modern design principles with clean, efficient code. I'd love to discuss this further at your convenience. Best regards, Jane Doe.",
    platform: "Upwork",
  },
  {
    from_address: "notifications@onlinejobs.ph",
    subject: "Application received: Virtual Assistant needed",
    body: "Your application for the Virtual Assistant position has been received. The employer will review your profile and reach out if they're interested in moving forward. You can track the status of your application in your dashboard.",
    platform: "OnlineJobs.ph",
  },
  {
    from_address: "facebook@notification.facebook.com",
    subject: "New message from Client on Facebook",
    body: "Hi! I saw your work and I'm very interested in hiring you for my project. Are you available for a quick call this week? Let me know what time works best for you. Thanks!",
    platform: "Facebook",
  },
];

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const msg = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];

  const { data, error } = await supabase
    .from("inbox_messages")
    .insert({
      user_id: user.id,
      from_address: msg.from_address,
      subject: msg.subject,
      body: msg.body,
      platform: msg.platform,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: data });
}
