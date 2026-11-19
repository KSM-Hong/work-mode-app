import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tree } from "./Tree";
import { forestState } from "./storage";

type Profile = { id: string; display_name: string; friend_code: string; tree_minutes: number };
type Link = { id: string; requester: string; addressee: string; status: string };

/** Upload tree progress if signed in. Safe to call offline. */
export async function syncTree(workSeconds: number) {
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    await supabase.from("profiles").update({ tree_minutes: Math.floor(workSeconds / 60), updated_at: new Date().toISOString() }).eq("id", uid);
  } catch { /* offline */ }
}

function FriendTree({ p }: { p: Profile }) {
  const { forests, grownTrees, g } = forestState(p.tree_minutes * 60);
  return (
    <div className="flex flex-col items-center rounded-2xl bg-secondary p-3 text-secondary-foreground">
      <div className="flex min-h-6 flex-wrap justify-center opacity-70">
        {Array.from({ length: grownTrees }, (_, i) => <Tree key={i} g={1} className="h-6 w-5" />)}
      </div>
      <Tree g={g} className="h-28 w-28" />
      <div className="font-medium">{p.display_name}</div>
      {forests > 0 && <div className="text-xs">{"🌲".repeat(Math.min(forests, 10))}</div>}
    </div>
  );
}

export function Friends({ workSeconds, onClose }: { workSeconds: number; onClose: () => void }) {
  const [me, setMe] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [links, setLinks] = useState<Link[]>([]);
  const [people, setPeople] = useState<Record<string, Profile>>({});

  const refresh = async () => {
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user.id;
    if (!uid) { setMe(null); setLoading(false); return; }
    const [{ data: ls }, { data: ps }] = await Promise.all([
      supabase.from("friendships").select("id,requester,addressee,status"),
      supabase.from("profiles").select("id,display_name,friend_code,tree_minutes"),
    ]);
    const map: Record<string, Profile> = {};
    (ps ?? []).forEach((p) => { map[p.id] = p; });
    setPeople(map); setLinks(ls ?? []); setMe(map[uid] ?? null); setLoading(false);
  };
  useEffect(() => { syncTree(workSeconds).then(refresh); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const join = async () => {
    const n = name.trim();
    if (!n) return;
    setMsg("");
    let { data: s } = await supabase.auth.getSession();
    if (!s.session) {
      const r = await supabase.auth.signInAnonymously();
      if (r.error) { setMsg("Couldn't connect. Check your internet and try again."); return; }
      s = { session: r.data.session };
    }
    const uid = s.session!.user.id;
    const { error } = await supabase.from("profiles").insert({ id: uid, display_name: n.slice(0, 40), tree_minutes: Math.floor(workSeconds / 60) });
    if (error) { setMsg("Couldn't save your name. Try again."); return; }
    refresh();
  };
  const add = async () => {
    setMsg("");
    const { data, error } = await supabase.rpc("send_friend_request", { _code: code });
    if (error) { setMsg("Couldn't send. Try again."); return; }
    setMsg({ sent: "Request sent 🌱", not_found: "No one has that code.", self: "That's your own code.", exists: "You're already connected." }[data as string] ?? "");
    setCode(""); refresh();
  };
  const accept = async (id: string) => { await supabase.from("friendships").update({ status: "accepted" }).eq("id", id); refresh(); };
  const remove = async (id: string) => { await supabase.from("friendships").delete().eq("id", id); refresh(); };

  const other = (l: Link) => people[l.requester === me?.id ? l.addressee : l.requester];
  const friends = links.filter((l) => l.status === "accepted");
  const incoming = links.filter((l) => l.status === "pending" && l.addressee === me?.id);
  const outgoing = links.filter((l) => l.status === "pending" && l.requester === me?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Friends’ garden</h2>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
        {loading ? <p className="mt-4 text-sm text-muted-foreground">Loading…</p> : !me ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">Choose a name your friends will see. Only your name and your tree are shared.</p>
            <div className="flex gap-2">
              <Input placeholder="Your name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
              <Button onClick={join}>Continue</Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            <div className="rounded-xl bg-secondary p-3 text-sm text-secondary-foreground">
              Hi {me.display_name}. Your friend code: <span className="font-mono text-base font-semibold">{me.friend_code}</span>
              <Button size="sm" variant="ghost" onClick={() => navigator.clipboard?.writeText(me.friend_code)}>Copy</Button>
            </div>
            <div className="flex gap-2">
              <Input placeholder="Friend’s code, e.g. TREE-4K7Q" value={code} onChange={(e) => setCode(e.target.value)} />
              <Button onClick={add} disabled={!code.trim()}>Add friend</Button>
            </div>
            {incoming.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                <span>{other(l)?.display_name ?? "Someone"} wants to be friends</span>
                <span className="flex gap-2"><Button size="sm" onClick={() => accept(l.id)}>Accept</Button><Button size="sm" variant="ghost" onClick={() => remove(l.id)}>Decline</Button></span>
              </div>
            ))}
            {outgoing.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Waiting for {other(l)?.display_name ?? "friend"} to accept</span>
                <Button size="sm" variant="ghost" onClick={() => remove(l.id)}>Cancel</Button>
              </div>
            ))}
            {friends.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {friends.map((l) => { const p = other(l); return p ? (
                  <div key={l.id} className="group relative">
                    <FriendTree p={p} />
                    <button className="absolute right-2 top-1 hidden text-xs text-muted-foreground group-hover:block" onClick={() => remove(l.id)}>Remove</button>
                  </div>) : null; })}
              </div>
            ) : <p className="text-sm text-muted-foreground">Share your code with a friend to see each other’s trees.</p>}
            {msg && <p className="text-sm">{msg}</p>}
          </div>
        )}
        {!me && msg && <p className="mt-2 text-sm">{msg}</p>}
      </div>
    </div>
  );
}
