import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

async function getGoogleClient(userId: string) {
  const supabase = createClient();
  const { data: integration } = await supabase
    .from("user_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "google_calendar")
    .maybeSingle();

  if (!integration?.refresh_token) return null;

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  // Refresh the token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: integration.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenRes.ok) {
    // Token revoked — remove integration
    await supabase.from("user_integrations").delete().eq("id", integration.id);
    return null;
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // Update integration
  await supabase
    .from("user_integrations")
    .update({ access_token: accessToken, updated_at: new Date().toISOString() })
    .eq("id", integration.id);

  return { accessToken, integration };
}

async function importFromGoogle(supabase: any, userId: string, accessToken: string) {
  // Fetch events from Google Calendar
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?" +
    new URLSearchParams({
      timeMin: new Date(Date.now() - 30 * 86400000).toISOString(),
      timeMax: new Date(Date.now() + 90 * 86400000).toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
    }),
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) return { imported: 0, error: "Failed to fetch Google events" };

  const data = await res.json();
  const items = data.items ?? [];
  let imported = 0;

  for (const event of items) {
    if (!event.id) continue;

    // Check if already imported
    const { data: existing } = await supabase
      .from("events")
      .select("id")
      .eq("user_id", userId)
      .eq("google_event_id", event.id)
      .maybeSingle();

    if (existing) {
      // Update existing
      const start = event.start?.dateTime || event.start?.date;
      const end = event.end?.dateTime || event.end?.date;
      if (start) {
        await supabase
          .from("events")
          .update({
            title: event.summary ?? "Untitled",
            description: event.description ?? "",
            start_time: new Date(start).toISOString(),
            end_time: end ? new Date(end).toISOString() : null,
            google_etag: event.etag ?? null,
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      }
      continue;
    }

    const start = event.start?.dateTime || event.start?.date;
    if (!start) continue;

    await supabase.from("events").insert({
      user_id: userId,
      title: event.summary ?? "Untitled",
      description: event.description ?? "",
      start_time: new Date(start).toISOString(),
      end_time: event.end?.dateTime ? new Date(event.end.dateTime).toISOString() : event.end?.date ? new Date(event.end.date).toISOString() : null,
      all_day: !!event.start?.date,
      meeting_link: event.hangoutLink ?? null,
      source: "google_calendar",
      google_event_id: event.id,
      google_etag: event.etag ?? null,
      last_synced_at: new Date().toISOString(),
    });
    imported++;
  }

  return { imported };
}

async function exportToGoogle(supabase: any, userId: string, accessToken: string) {
  // Find local events without google_event_id
  const { data: localEvents } = await supabase
    .from("events")
    .select("*")
    .eq("user_id", userId)
    .is("google_event_id", null)
    .neq("source", "google_calendar")
    .gte("start_time", new Date(Date.now() - 7 * 86400000).toISOString());

  let exported = 0;

  for (const event of localEvents ?? []) {
    const googleEvent: any = {
      summary: event.title,
      description: event.description ?? "",
    };

    if (event.all_day) {
      googleEvent.start = { date: event.start_time.split("T")[0], timeZone: "UTC" };
      googleEvent.end = {
        date: event.end_time ? event.end_time.split("T")[0] : event.start_time.split("T")[0],
        timeZone: "UTC",
      };
    } else {
      googleEvent.start = { dateTime: event.start_time, timeZone: "UTC" };
      googleEvent.end = {
        dateTime: event.end_time || event.start_time,
        timeZone: "UTC",
      };
    }

    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(googleEvent),
    });

    if (res.ok) {
      const created = await res.json();
      await supabase
        .from("events")
        .update({ google_event_id: created.id, last_synced_at: new Date().toISOString() })
        .eq("id", event.id);
      exported++;
    }
  }

  return { exported };
}

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const google = await getGoogleClient(user.id);
  if (!google) {
    return NextResponse.json(
      { error: "Google Calendar not connected. Go to Settings to connect.", needsConnect: true },
      { status: 400 }
    );
  }

  const importResult = await importFromGoogle(supabase, user.id, google.accessToken);
  if (importResult.error) {
    return NextResponse.json({ error: importResult.error }, { status: 500 });
  }

  const exportResult = await exportToGoogle(supabase, user.id, google.accessToken);

  return NextResponse.json({
    success: true,
    imported: importResult.imported,
    exported: exportResult.exported,
    message: `Synced! Imported ${importResult.imported} events from Google, exported ${exportResult.exported} to Google.`,
  });
}
