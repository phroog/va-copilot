"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";
import Link from "next/link";

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string | null;
  all_day: boolean;
  meeting_link: string | null;
  calendly_link: string | null;
  job_id: string | null;
  pitch_id: string | null;
  source: string;
  created_at: string;
  jobs?: { title: string; platform: string } | null;
  follow_up_id?: string;
  follow_up_done?: boolean;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const { t } = useLocale();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<CalendarEvent | null>(null);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);

  // Create/Edit form
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formAllDay, setFormAllDay] = useState(false);
  const [formMeetingLink, setFormMeetingLink] = useState("");
  const [formCalendly, setFormCalendly] = useState("");

  const fetchEvents = useCallback(async (month: number, year: number) => {
    setLoading(true);
    try {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59);
      const startStr = start.toISOString().split("T")[0];
      const endStr = end.toISOString().split("T")[0];

      const res = await fetch(`/api/events?start=${startStr}&end=${endStr}`);
      const data = await res.json();
      setEvents(data.events ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(currentMonth, currentYear);
  }, [currentMonth, currentYear, fetchEvents]);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  };

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const getEventsForDay = (day: number, month: number, year: number) => {
    return events.filter((e) => {
      const d = new Date(e.start_time);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  };

  const dayEvents = selectedDate ? getEventsForDay(selectedDate.getDate(), selectedDate.getMonth(), selectedDate.getFullYear()) : [];

  const openCreate = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    setFormDate(date.toISOString().split("T")[0]);
    setFormTitle("");
    setFormDesc("");
    setFormStart("");
    setFormEnd("");
    setFormAllDay(false);
    setFormMeetingLink("");
    setFormCalendly("");
    setSelectedDate(date);
    setShowCreate(true);
    setShowDetail(null);
  };

  const handleCreate = async () => {
    if (!formTitle || !formDate) return;
    const start_time = formAllDay ? new Date(formDate + "T00:00:00").toISOString() : new Date(formDate + "T" + (formStart || "09:00")).toISOString();
    const end_time = formAllDay ? null : formEnd ? new Date(formDate + "T" + formEnd).toISOString() : null;
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formTitle,
        description: formDesc,
        start_time,
        end_time,
        all_day: formAllDay,
        meeting_link: formMeetingLink || null,
        calendly_link: formCalendly || null,
      }),
    });
    if (res.ok) {
      setShowCreate(false);
      fetchEvents(currentMonth, currentYear);
    }
  };

  const openEdit = (ev: CalendarEvent) => {
    const d = new Date(ev.start_time);
    setEditEvent(ev);
    setFormTitle(ev.title);
    setFormDesc(ev.description ?? "");
    setFormDate(d.toISOString().split("T")[0]);
    setFormStart(d.toTimeString().slice(0, 5));
    setFormEnd(ev.end_time ? new Date(ev.end_time).toTimeString().slice(0, 5) : "");
    setFormAllDay(ev.all_day);
    setFormMeetingLink(ev.meeting_link ?? "");
    setFormCalendly(ev.calendly_link ?? "");
    setShowDetail(null);
  };

  const handleEdit = async () => {
    if (!editEvent || !formTitle || !formDate) return;
    const start_time = formAllDay ? new Date(formDate + "T00:00:00").toISOString() : new Date(formDate + "T" + (formStart || "09:00")).toISOString();
    const end_time = formAllDay ? null : formEnd ? new Date(formDate + "T" + formEnd).toISOString() : null;
    const res = await fetch(`/api/events/${editEvent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formTitle,
        description: formDesc,
        start_time,
        end_time,
        all_day: formAllDay,
        meeting_link: formMeetingLink || null,
        calendly_link: formCalendly || null,
      }),
    });
    if (res.ok) {
      setEditEvent(null);
      fetchEvents(currentMonth, currentYear);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (res.ok) {
      setShowDetail(null);
      fetchEvents(currentMonth, currentYear);
    }
  };

  const isToday = (day: number) => {
    return day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
  };

  // Build calendar cells
  const cells: { day: number; month: number; year: number; isCurrent: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, month: currentMonth - 1, year: currentYear - (currentMonth === 0 ? 1 : 0), isCurrent: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month: currentMonth, year: currentYear, isCurrent: true });
  }
  while (cells.length % 7 !== 0) {
    const nextDay = cells.length + 1 - firstDay - daysInMonth + 1;
    cells.push({ day: nextDay, month: currentMonth + 1, year: currentYear + (currentMonth === 11 ? 1 : 0), isCurrent: false });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-extrabold">📅 {t("calendar")}</h1>

      <Card>
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="outline" size="sm" onClick={prevMonth}>◀</Button>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <Button variant="outline" size="sm" onClick={nextMonth}>▶</Button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase py-1">{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              const dayEvts = cell.isCurrent ? getEventsForDay(cell.day, cell.month, cell.year) : [];
              return (
                <button
                  key={i}
                  onClick={() => cell.isCurrent && setSelectedDate(new Date(cell.year, cell.month, cell.day))}
                  onDoubleClick={() => cell.isCurrent && openCreate(cell.day)}
                  className={`relative min-h-[70px] rounded-xl p-1.5 text-left transition-all duration-150 border-2 ${
                    cell.isCurrent
                      ? isToday(cell.day)
                        ? "bg-kawaii-purple/15 dark:bg-kawaii-purple/20 border-kawaii-purple/40 dark:border-kawaii-purple/50"
                        : "bg-white/60 dark:bg-dark-surface/40 border-transparent hover:border-kawaii-lavender/40 dark:hover:border-kawaii-lavender/30"
                      : "bg-transparent border-transparent opacity-30"
                  }`}
                >
                  <span className={`text-sm font-bold ${isToday(cell.day) ? "text-kawaii-purple dark:text-kawaii-lavender" : "text-slate-600 dark:text-slate-300"}`}>
                    {cell.day}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvts.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        className={`text-[10px] leading-tight px-1.5 py-0.5 rounded-full truncate font-medium ${
                          ev.source === "follow-up"
                            ? "bg-pink-200 dark:bg-pink-800/60 text-pink-800 dark:text-pink-200"
                            : "bg-kawaii-lavender/40 dark:bg-kawaii-purple/30 text-slate-700 dark:text-slate-200"
                        }`}
                        title={ev.title}
                      >
                        {ev.title.slice(0, 14)}
                      </div>
                    ))}
                    {dayEvts.length > 3 && (
                      <div className="text-[10px] text-kawaii-purple dark:text-kawaii-lavender font-bold px-1">
                        +{dayEvts.length - 3} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day Detail */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>
                📅 {selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </span>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={() => openCreate(selectedDate.getDate())}>
                  ➕ {t("addEvent")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>✕</Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dayEvents.length === 0 ? (
              <p className="text-slate-400 text-sm">{t("noEvents")}</p>
            ) : (
              dayEvents.map((ev) => {
                const isFollowUp = ev.source === "follow-up";
                return (
                  <div
                    key={ev.id}
                    className={`p-4 rounded-2xl cursor-pointer transition-all squishy ${
                      isFollowUp
                        ? "bg-pink-100 dark:bg-pink-900/30 border-2 border-pink-200 dark:border-pink-700/50"
                        : "bg-kawaii-lavender/15 dark:bg-dark-surface/50 border-2 border-transparent hover:border-kawaii-lavender/30"
                    }`}
                    onClick={() => setShowDetail(ev)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isFollowUp && <span className="text-sm">🔔</span>}
                        <span className="font-bold text-slate-800 dark:text-slate-100">{ev.title}</span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {ev.all_day ? "All day" : new Date(ev.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {ev.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{ev.description}</p>
                    )}
                    {ev.meeting_link && (
                      <a href={ev.meeting_link} target="_blank" rel="noopener noreferrer" className="text-xs text-kawaii-purple dark:text-kawaii-lavender underline mt-1 inline-block" onClick={(e) => e.stopPropagation()}>
                        🔗 Google Meet
                      </a>
                    )}
                    {ev.calendly_link && (
                      <a href={ev.calendly_link} target="_blank" rel="noopener noreferrer" className="text-xs text-kawaii-purple dark:text-kawaii-lavender underline mt-1 inline-block ml-3" onClick={(e) => e.stopPropagation()}>
                        📅 Calendly
                      </a>
                    )}
                    {ev.jobs && (
                      <p className="text-xs text-slate-400 mt-1">💼 {ev.jobs.title} — {ev.jobs.platform}</p>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowDetail(null)}>
          <div className="bg-white dark:bg-dark-card rounded-3xl p-6 max-w-md w-full shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{showDetail.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {new Date(showDetail.start_time).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  {showDetail.end_time && ` — ${new Date(showDetail.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                </p>
              </div>
              <button onClick={() => setShowDetail(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl">✕</button>
            </div>

            {showDetail.description && (
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{showDetail.description}</p>
            )}

            <div className="space-y-2 mb-4">
              {showDetail.meeting_link && (
                <a href={showDetail.meeting_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-kawaii-purple dark:text-kawaii-lavender underline">
                  🔗 Google Meet — Join
                </a>
              )}
              {showDetail.calendly_link && (
                <a href={showDetail.calendly_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-kawaii-purple dark:text-kawaii-lavender underline">
                  📅 Calendly — Book
                </a>
              )}
              {showDetail.jobs && (
                <p className="text-sm text-slate-500">💼 {showDetail.jobs.title} ({showDetail.jobs.platform})</p>
              )}
              {showDetail.source === "follow-up" && (
                <p className="text-sm text-pink-500">🔔 Follow-up reminder</p>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <Link href={`/dashboard/time-tracker?eventId=${showDetail.id}`}>
                <Button variant="primary" size="sm">⏱ Track Time</Button>
              </Link>
              {showDetail.source !== "follow-up" && (
                <>
                  <Button variant="outline" size="sm" onClick={() => openEdit(showDetail)}>✏️ Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(showDetail.id)}>🗑️ Delete</Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-dark-card rounded-3xl p-6 max-w-md w-full shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">➕ {t("addEvent")}</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">{t("jobTitle")}</Label>
                <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Event title" />
              </div>
              <div>
                <Label className="text-xs">{t("description")}</Label>
                <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Event description" />
              </div>
              <div>
                <Label className="text-xs">{t("date")}</Label>
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="allDay" checked={formAllDay} onChange={(e) => setFormAllDay(e.target.checked)} className="rounded" />
                <Label htmlFor="allDay" className="text-xs">{t("allDay")}</Label>
              </div>
              {!formAllDay && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">{t("startTime")}</Label>
                    <Input type="time" value={formStart} onChange={(e) => setFormStart(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">{t("endTime")}</Label>
                    <Input type="time" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} />
                  </div>
                </div>
              )}
              <div>
                <Label className="text-xs">Google Meet Link</Label>
                <Input value={formMeetingLink} onChange={(e) => setFormMeetingLink(e.target.value)} placeholder="https://meet.google.com/..." />
              </div>
              <div>
                <Label className="text-xs">Calendly Link</Label>
                <Input value={formCalendly} onChange={(e) => setFormCalendly(e.target.value)} placeholder="https://calendly.com/..." />
              </div>
              <Button variant="primary" className="w-full" onClick={handleCreate} disabled={!formTitle || !formDate}>
                💾 {t("save")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setEditEvent(null)}>
          <div className="bg-white dark:bg-dark-card rounded-3xl p-6 max-w-md w-full shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">✏️ {t("editEvent")}</h3>
              <button onClick={() => setEditEvent(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">{t("jobTitle")}</Label>
                <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Event title" />
              </div>
              <div>
                <Label className="text-xs">{t("description")}</Label>
                <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Event description" />
              </div>
              <div>
                <Label className="text-xs">{t("date")}</Label>
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="editAllDay" checked={formAllDay} onChange={(e) => setFormAllDay(e.target.checked)} className="rounded" />
                <Label htmlFor="editAllDay" className="text-xs">{t("allDay")}</Label>
              </div>
              {!formAllDay && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">{t("startTime")}</Label>
                    <Input type="time" value={formStart} onChange={(e) => setFormStart(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">{t("endTime")}</Label>
                    <Input type="time" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} />
                  </div>
                </div>
              )}
              <div>
                <Label className="text-xs">Google Meet Link</Label>
                <Input value={formMeetingLink} onChange={(e) => setFormMeetingLink(e.target.value)} placeholder="https://meet.google.com/..." />
              </div>
              <div>
                <Label className="text-xs">Calendly Link</Label>
                <Input value={formCalendly} onChange={(e) => setFormCalendly(e.target.value)} placeholder="https://calendly.com/..." />
              </div>
              <div className="flex gap-2">
                <Button variant="primary" className="flex-1" onClick={handleEdit} disabled={!formTitle || !formDate}>
                  💾 {t("save")}
                </Button>
                <Button variant="ghost" onClick={() => setEditEvent(null)}>{t("cancel")}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
