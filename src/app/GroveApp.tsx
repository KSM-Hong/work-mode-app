import { useEffect, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RotateCcw } from "lucide-react";
import { Tree } from "./Tree";
import { Friends, syncTree } from "./Friends";
import { addTime, emptyData, forestState, load, save, setRating, todayKey, type Data, type Rating, type SoundId } from "./storage";
import { gradingDates, timerOnStart, type Phase } from "./session";

declare global {
  interface Window { grove?: { setMini: (mini: boolean) => void; setOpacity?: (o: number) => void } }
}

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const hm = (s: number) => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;

const SOUNDS: Record<SoundId, { label: string; notes: number[]; type: OscillatorType; gap: number; len: number }> = {
  chime: { label: "Chime", notes: [660, 880, 990], type: "sine", gap: 0.35, len: 0.6 },
  bell: { label: "Bell", notes: [523, 523, 784], type: "triangle", gap: 0.5, len: 1.2 },
  digital: { label: "Digital beep", notes: [1000, 1000, 1000, 1000], type: "square", gap: 0.2, len: 0.12 },
  soft: { label: "Soft tone", notes: [440, 554], type: "sine", gap: 0.6, len: 1 },
};
function playSound(id: SoundId, volume: number) {
  try {
    const s = SOUNDS[id] ?? SOUNDS.chime;
    const ctx = new AudioContext();
    const peak = Math.max(0.0011, (volume / 100) * 0.5);
    s.notes.forEach((f, i) => {
      const t = i * s.gap;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = s.type; o.frequency.value = f;
      g.gain.setValueAtTime(peak, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + s.len);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + s.len);
    });
  } catch { /* ignore */ }
}
function notify(text: string, sound: SoundId, volume: number) {
  playSound(sound, volume);
  if ("Notification" in window && Notification.permission === "granted") new Notification("Work Mode", { body: text });
}

function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" aria-label={`${n} stars`} onClick={() => onChange(value === n ? 0 : n)}
          className={`text-2xl leading-none ${n <= value ? "text-work" : "text-muted-foreground/40"}`}>★</button>
      ))}
    </div>
  );
}
const starStr = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);
const CATS: { key: "goal" | "satisfaction" | "focus"; label: string }[] = [
  { key: "goal", label: "Daily goal reached" },
  { key: "satisfaction", label: "Satisfaction level" },
  { key: "focus", label: "Focus level" },
];
function DayTip({ active, payload }: { active?: boolean; payload?: { payload: { full: string; Work: number; Rest: number; rating?: Rating } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  const rating = p.rating;
  return (
    <div className="max-w-64 rounded-lg border bg-popover p-3 text-sm text-popover-foreground shadow-md">
      <div className="font-semibold">{p.full}</div>
      <div>Work {p.Work} min · Rest {p.Rest} min</div>
      {rating ? (
        <div className="mt-2 space-y-0.5">
          {CATS.map((c) => <div key={c.key}>{c.label}: <span className="text-work">{starStr(rating[c.key])}</span></div>)}
          {rating.note && <div className="mt-1 italic text-muted-foreground">“{rating.note}”</div>}
        </div>
      ) : <div className="mt-1 text-muted-foreground">Not graded</div>}
    </div>
  );
}

export function GroveApp() {
  const [data, setData] = useState<Data>(emptyData);
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>("work");
  const [left, setLeft] = useState(0);
  const [session, setSession] = useState<{ work: number; rest: number } | null>(null);
  const [summary, setSummary] = useState<{ work: number; rest: number } | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const prefsRef = useRef(data.prefs);
  prefsRef.current = data.prefs;
  const [showSettings, setShowSettings] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const stoppedWith = useRef<{ work: number; rest: number } | null>(null);
  const sessionStartDay = useRef<string | null>(null);
  const totalRef = useRef(0);
  totalRef.current = data.totalWorkSeconds;
  useEffect(() => {
    if (!ready) return;
    syncTree(totalRef.current);
    const id = setInterval(() => syncTree(totalRef.current), 3 * 60 * 1000);
    return () => clearInterval(id);
  }, [ready]);
  const [grading, setGrading] = useState<Rating | null>(null);
  const [gradeDates, setGradeDates] = useState(() => gradingDates(null));
  const [gradeDay, setGradeDay] = useState("");
  const gradeDrafts = useRef<Record<string, Rating>>({});
  useEffect(() => { if (ready) window.grove?.setOpacity?.(data.prefs.opacity / 100); }, [data.prefs.opacity, ready]);
  const setPref = <K extends keyof Data["prefs"]>(k: K, v: Data["prefs"][K]) => setData((d) => ({ ...d, prefs: { ...d.prefs, [k]: v } }));

  useEffect(() => { setData(load()); setReady(true); }, []);
  useEffect(() => { document.documentElement.classList.toggle("dark", data.prefs.dark); }, [data.prefs.dark]);
  useEffect(() => { if (ready) save(data); }, [data, ready]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const p = phaseRef.current;
      setData((d) => addTime(d, p, 1));
      setSession((s) => (s ? { ...s, [p]: s[p] + 1 } : s));
      setLeft((l) => {
        if (l > 1) return l - 1;
        const next: Phase = p === "work" ? "rest" : "work";
        notify(next === "rest" ? "Work done — time to rest 🌿" : "Rest over — back to work 🌱", prefsRef.current.sound, prefsRef.current.volume);
        setPhase(next);
        return (next === "work" ? data.settings.work : data.settings.rest) * 60;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, data.settings.work, data.settings.rest]);

  const start = (restart = false) => {
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    setSummary(null);
    if (!session) sessionStartDay.current = todayKey();
    setSession((s) => s ?? { work: 0, rest: 0 });
    const next = timerOnStart(phase, left, data.settings, stoppedWith.current, session !== null, restart);
    setPhase(next.phase);
    setLeft(next.left);
    stoppedWith.current = null;
    setRunning(true);
    window.grove?.setMini(true);
  };
  const stop = () => { stoppedWith.current = { ...data.settings }; setRunning(false); window.grove?.setMini(false); };
  const openGrade = (startDay: string | null = null) => {
    const dates = gradingDates(startDay);
    setGradeDates(dates);
    setGradeDay(dates.selected);
    gradeDrafts.current = {};
    setGrading(data.days[dates.selected]?.rating ?? { goal: 0, satisfaction: 0, focus: 0, note: "" });
  };
  const changeGradeDay = (day: string) => {
    if (!day || day > gradeDates.today) return;
    if (grading) gradeDrafts.current[gradeDay] = grading;
    setGradeDay(day);
    setGrading(gradeDrafts.current[day] ?? data.days[day]?.rating ?? { goal: 0, satisfaction: 0, focus: 0, note: "" });
  };
  const end = () => {
    playSound(data.prefs.sound, data.prefs.volume);
    setSummary(session ?? { work: 0, rest: 0 }); setSession(null); setLeft(0); setPhase("work");
    openGrade(sessionStartDay.current);
    sessionStartDay.current = null;
    stoppedWith.current = null;
  };
  const saveGrade = () => { if (grading && gradeDay) setData((d) => setRating(d, gradeDay, grading)); setGrading(null); };
  const setSetting = (k: "work" | "rest", v: number) =>
    setData((d) => ({ ...d, settings: { ...d.settings, [k]: Math.max(1, Math.min(240, v || 1)) } }));

  const { forests, grownTrees, g } = forestState(data.totalWorkSeconds);
  const [preview, setPreview] = useState(0.5);
  const [menu, setMenu] = useState(false);
  const isDesktop = typeof window !== "undefined" && !!window.grove;

  if (running) {
    return (
      <div className="drag relative flex h-screen items-center gap-3 overflow-hidden bg-card px-3" onContextMenu={(e) => { e.preventDefault(); setMenu(true); }}>
        {menu && (
          <div className="no-drag absolute inset-0 z-10 flex items-center gap-2 bg-card px-3 text-xs font-medium">
            <span className="shrink-0">Opacity {data.prefs.opacity}%</span>
            <input type="range" min={20} max={100} value={data.prefs.opacity} onChange={(e) => setPref("opacity", +e.target.value)} className="flex-1 accent-primary" />
            <Button size="sm" variant="ghost" onClick={() => setMenu(false)}>Done</Button>
          </div>
        )}
        <Tree g={g} className="h-16 w-16 shrink-0" />
        <div className="flex-1">
          <div className={`text-xs font-semibold uppercase tracking-widest ${phase === "work" ? "text-work" : "text-rest"}`}>
            {phase}
          </div>
          <div className="font-display text-4xl tabular-nums leading-none text-foreground">{fmt(left)}</div>
        </div>
        <Button size="sm" variant="outline" className="no-drag" onClick={stop}>Stop</Button>
      </div>
    );
  }

  const days = Object.keys(data.days).sort().slice(-14);
  const chart = days.flatMap((k) => {
    const record = data.days[k];
    if (!record) return [];
    return [{
    day: k.slice(5),
    full: k,
    rating: record.rating,
    Work: +(record.work / 60).toFixed(1),
    Rest: +(record.rest / 60).toFixed(1),
    }];
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="drag h-8" />
      <main className="mx-auto grid max-w-5xl gap-6 px-6 pb-10 md:grid-cols-[1fr_1.2fr]">
        <section className="rounded-3xl bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl text-primary">Work Mode</h1>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowFriends(true)}>Friends</Button>
              <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>⚙ Settings</Button>
            </div>
          </div>
          <div className="mx-auto my-4 w-full max-w-sm">
            <div className="flex flex-wrap justify-center opacity-70">
              {Array.from({ length: grownTrees }, (_, i) => <Tree key={i} g={1} className="h-12 w-10" />)}
            </div>
            <Tree g={g} className="mx-auto h-56 w-56" />
          </div>
          {forests > 0 && <p className="text-center text-sm text-muted-foreground">{"🌲".repeat(Math.min(forests, 20))} {forests} {forests === 1 ? "forest" : "forests"}</p>}
          <div className="mt-6 grid grid-cols-2 gap-3">
            {(["work", "rest"] as const).map((k) => (
              <label key={k} className="text-sm font-medium capitalize">
                {k} minutes
                <Input type="number" min={1} value={data.settings[k]} onChange={(e) => setSetting(k, +e.target.value)} className="mt-1" />
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button className="flex-1" size="lg" onClick={() => start()}>{session ? "Resume" : "Start"}</Button>
            {session && <Button variant="outline" className="px-4" size="lg" onClick={() => start(true)}><RotateCcw />Restart</Button>}
            <Button variant="secondary" className="px-4" size="lg" onClick={end} disabled={!session}>End</Button>
          </div>
          {summary && (
            <div className="mt-3 rounded-xl bg-secondary p-3 text-sm text-secondary-foreground">
              Session ended — {hm(summary.work)} of work, {hm(summary.rest)} of rest. 🌳
            </div>
          )}
        </section>
        <section className="flex flex-col gap-6">
          <div className="rounded-3xl bg-card p-6 shadow-sm">
            <h2 className="mb-3 text-xl">Last 14 days (minutes)</h2>
            <div className="h-56">
              {chart.length ? (
                <ResponsiveContainer>
                  <BarChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="day" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip content={<DayTip />} />
                    <Legend />
                    <Bar dataKey="Work" stackId="a" fill="var(--work)" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="Rest" stackId="a" fill="var(--rest)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="pt-20 text-center text-sm text-muted-foreground">Your first session will appear here.</p>
              )}
            </div>
          </div>
          <div className="rounded-3xl bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl">Today’s grade</h2>
              <Button size="sm" variant="secondary" onClick={() => openGrade()}>
                {data.days[todayKey()]?.rating ? "Edit grade" : "Add grade"}
              </Button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Only you can see your grades. Point at a day in the chart to see them.</p>
          </div>
        </section>
      </main>
      {grading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="grade-title" className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
            <h2 id="grade-title" className="text-xl">Grade your day</h2>
            <div className="mt-4 space-y-4">
              <label className="block text-sm font-medium">Grade date
                <Input type="date" value={gradeDay} max={gradeDates.today} onChange={(e) => changeGradeDay(e.target.value)} className="mt-1" />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={gradeDay === gradeDates.yesterday} onChange={(e) => changeGradeDay(e.target.checked ? gradeDates.yesterday : gradeDates.today)} className="h-4 w-4 accent-primary" />
                Was this from yesterday?
              </label>
              {CATS.map((c) => (
                <div key={c.key} className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{c.label}</span>
                  <Stars value={grading[c.key]} onChange={(n) => setGrading({ ...grading, [c.key]: n })} />
                </div>
              ))}
              <Textarea rows={3} placeholder="Note (optional)" value={grading.note} onChange={(e) => setGrading({ ...grading, note: e.target.value })} />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setGrading(null)}>Skip</Button>
              <Button onClick={saveGrade}>Save</Button>
            </div>
          </div>
        </div>
      )}
      {showFriends && <Friends workSeconds={data.totalWorkSeconds} onClose={() => setShowFriends(false)} />}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
            <h2 className="text-xl">Settings</h2>
            <div className="mt-4 space-y-5 text-sm">
              <label className="block font-medium">Alarm sound
                <div className="mt-1 flex gap-2">
                  <select className="flex-1 rounded-md border bg-background px-2 py-2" value={data.prefs.sound} onChange={(e) => setPref("sound", e.target.value as SoundId)}>
                    {(Object.keys(SOUNDS) as SoundId[]).map((id) => <option key={id} value={id}>{SOUNDS[id].label}</option>)}
                  </select>
                  <Button variant="outline" size="sm" onClick={() => playSound(data.prefs.sound, data.prefs.volume)}>▶ Test</Button>
                </div>
              </label>
              <label className="block font-medium">Sound level: {data.prefs.volume}%
                <input type="range" min={0} max={100} value={data.prefs.volume} onChange={(e) => setPref("volume", +e.target.value)} className="mt-1 w-full accent-primary" />
              </label>
              <label className="flex items-center justify-between font-medium">Dark mode
                <input type="checkbox" checked={data.prefs.dark} onChange={(e) => setPref("dark", e.target.checked)} className="h-5 w-5 accent-primary" />
              </label>
              {!isDesktop && <div className="font-medium">Preview tree growth: {Math.round(preview * 100)}%
                <Tree g={preview} className="mx-auto h-32 w-32" />
                <input type="range" min={0} max={100} value={Math.round(preview * 100)} onChange={(e) => setPreview(+e.target.value / 100)} className="w-full accent-primary" />
              </div>}
              <label className="block font-medium">App opacity: {data.prefs.opacity}%
                <input type="range" min={20} max={100} value={data.prefs.opacity} onChange={(e) => setPref("opacity", +e.target.value)} className="mt-1 w-full accent-primary" />
              </label>
            </div>
            <div className="mt-5 flex justify-end"><Button onClick={() => setShowSettings(false)}>Done</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}
