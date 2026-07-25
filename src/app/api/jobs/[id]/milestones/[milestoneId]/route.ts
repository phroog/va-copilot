import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: { id: string; milestoneId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { milestoneId } = params;
  const body = await request.json();

  const update: Record<string, any> = {};
  if (body.title !== undefined) update.title = body.title;
  if (body.description !== undefined) update.description = body.description;
  if (body.due_date !== undefined) update.due_date = body.due_date;
  if (body.status !== undefined) update.status = body.status;
  if (body.order_index !== undefined) update.order_index = body.order_index;

  const { data, error } = await supabase
    .from("job_milestones")
    .update(update)
    .eq("id", milestoneId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ milestone: data });
}

export async function DELETE(request: Request, { params }: { params: { id: string; milestoneId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { milestoneId } = params;

  const { error } = await supabase
    .from("job_milestones")
    .delete()
    .eq("id", milestoneId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
