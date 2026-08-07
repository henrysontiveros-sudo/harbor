"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { laWallTimeToISO } from "@/lib/dates";
import { generateOccurrences, specToRRuleString, RecurrenceSpec } from "@/lib/recurrence";

interface Campus { id: string; name: string; slug: string }

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function NewEventForm({ campuses }: { campuses: Campus[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [ministry, setMinistry] = useState("");
  const [description, setDescription] = useState("");
  const [campusId, setCampusId] = useState(campuses[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [freq, setFreq] = useState<RecurrenceSpec["freq"]>("none");
  const [byweekday, setByweekday] = useState<number[]>([]);
  const [until, setUntil] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggleDay(d: number) {
    setByweekday((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!date || !startTime || !endTime) { setErr("Date and times are required."); return; }
    if (endTime <= startTime) { setErr("End time must be after start time."); return; }
    if (freq !== "none" && !until) { setErr("Pick an end date for the recurrence."); return; }

    setBusy(true);
    const startsISO = laWallTimeToISO(`${date}T${startTime}`);
    const endsISO = laWallTimeToISO(`${date}T${endTime}`);
    const spec: RecurrenceSpec = { freq, byweekday, until: until || null };

    const { data: { user } } = await supabase.auth.getUser();
    const { data: event, error } = await supabase
      .from("events")
      .insert({
        title: title.trim(),
        ministry: ministry.trim() || null,
        description: description.trim() || null,
        campus_id: campusId,
        created_by: user!.id,
        rrule: specToRRuleString(spec),
        starts_at: startsISO,
        ends_at: endsISO,
        recurrence_until: until ? laWallTimeToISO(`${until}T23:59`) : null,
      })
      .select("id")
      .single();

    if (error || !event) {
      setErr(error?.message ?? "Failed to create event.");
      setBusy(false);
      return;
    }

    const occs = generateOccurrences(startsISO, endsISO, spec);
    const { error: occErr } = await supabase
      .from("event_occurrences")
      .insert(occs.map((o) => ({ event_id: event.id, ...o })));

    if (occErr) {
      setErr("Event created but occurrences failed: " + occErr.message);
      setBusy(false);
      return;
    }

    router.push(`/events/${event.id}?created=1`);
  }

  return (
    <form onSubmit={submit} className="card p-4 sm:p-6 space-y-5">
      <div>
        <label className="label">Event title *</label>
        <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. NextGen Leader Training" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Ministry / team</label>
          <input className="input" value={ministry} onChange={(e) => setMinistry(e.target.value)}
            placeholder="e.g. NextGen, Worship, Outreach" />
        </div>
        <div>
          <label className="label">Congregation *</label>
          <select className="input" value={campusId} onChange={(e) => setCampusId(e.target.value)}>
            {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Description</label>
        <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="What's this event about? (visible to all staff)" />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="label">{freq === "none" ? "Date *" : "First date *"}</label>
          <input type="date" className="input" required value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Start *</label>
          <input type="time" className="input" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div>
          <label className="label">End *</label>
          <input type="time" className="input" required value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label">Repeats</label>
        <div className="flex flex-wrap gap-2">
          {([
            ["none", "One-time"],
            ["daily", "Daily"],
            ["weekly", "Weekly"],
            ["biweekly", "Every other week"],
            ["monthly", "Monthly"],
          ] as const).map(([v, l]) => (
            <button type="button" key={v} onClick={() => setFreq(v)}
              className={`badge px-3 py-1.5 cursor-pointer ${freq === v ? "bg-imperial text-white" : "bg-white border border-ink/15 text-ink/70"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {(freq === "weekly" || freq === "biweekly") && (
        <div>
          <label className="label">On days</label>
          <div className="flex flex-wrap gap-1.5">
            {DAY_LABELS.map((d, i) => (
              <button type="button" key={d} onClick={() => toggleDay(i)}
                className={`w-10 h-10 sm:w-11 rounded-lg text-xs font-bold ${byweekday.includes(i) ? "bg-cerulean text-white" : "bg-white border border-ink/15 text-ink/60"}`}>
                {d}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink/40 mt-1">Leave empty to repeat on the first date&apos;s weekday.</p>
        </div>
      )}

      {freq !== "none" && (
        <div className="max-w-[200px]">
          <label className="label">Repeat until *</label>
          <input type="date" className="input" value={until} onChange={(e) => setUntil(e.target.value)} />
        </div>
      )}

      {err && <p className="text-sm text-coral">{err}</p>}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
        <button type="button" onClick={() => router.back()} className="btn-secondary py-2.5 sm:py-2">Cancel</button>
        <button type="submit" disabled={busy} className="btn-primary py-2.5 sm:py-2">
          {busy ? "Creating…" : "Create event → add spaces"}
        </button>
      </div>
    </form>
  );
}
