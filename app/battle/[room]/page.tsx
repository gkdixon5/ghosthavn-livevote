"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "./client";

type BattleRow = {
  id: string;
  room_code: string;
  rapper_a: string;
  rapper_b: string;
  a_votes: number;
  b_votes: number;
  status: "ready" | "live" | "ended";
  ends_at: string | null;
  updated_at: string;
};

function msLeft(endsAt: string | null) {
  if (!endsAt) return 0;
  return Math.max(0, new Date(endsAt).getTime() - Date.now());
}

export default function BattleRoom({ params }: { params: { room: string } }) {
  const room = useMemo(() => params.room?.toLowerCase(), [params.room]);

  const [battle, setBattle] = useState<BattleRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [now, setNow] = useState(Date.now());

  // simple local 1-vote-per-device (per room) lock
  const canVote = Date.now() > cooldownUntil;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let unsub: (() => void) | null = null;

    async function init() {
      setLoading(true);
      setErr(null);

      // 1) ensure battle row exists for this room
      const existing = await supabase
        .from("battles")
        .select("*")
        .eq("room_code", room)
        .maybeSingle();

      if (existing.error) {
        setErr(existing.error.message);
        setLoading(false);
        return;
      }

      if (!existing.data) {
        const created = await supabase
          .from("battles")
          .insert({
            room_code: room,
            rapper_a: "Rapper A",
            rapper_b: "Rapper B",
            a_votes: 0,
            b_votes: 0,
            status: "ready",
            ends_at: null,
          })
          .select("*")
          .single();

        if (created.error) {
          setErr(created.error.message);
          setLoading(false);
          return;
        }
        setBattle(created.data as BattleRow);
      } else {
        setBattle(existing.data as BattleRow);
      }

      setLoading(false);

      // 2) realtime subscribe for vote updates
      const channel = supabase
        .channel(`battle-room-${room}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "battles", filter: `room_code=eq.${room}` },
          (payload) => {
            const row = payload.new as BattleRow;
            setBattle(row);
          }
        )
        .subscribe();

      unsub = () => {
        supabase.removeChannel(channel);
      };
    }

    init();

    return () => {
      if (unsub) unsub();
    };
  }, [room]);

  async function startBattle(durationSec: number) {
    if (!battle) return;
    const endsAt = new Date(Date.now() + durationSec * 1000).toISOString();

    const res = await supabase
      .from("battles")
      .update({
        status: "live",
        ends_at: endsAt,
        a_votes: 0,
        b_votes: 0,
      })
      .eq("room_code", room)
      .select("*")
      .single();

    if (res.error) setErr(res.error.message);
    else setBattle(res.data as BattleRow);
  }

  async function stopBattle() {
    const res = await supabase
      .from("battles")
      .update({ status: "ended", ends_at: null })
      .eq("room_code", room)
      .select("*")
      .single();
    if (res.error) setErr(res.error.message);
    else setBattle(res.data as BattleRow);
  }

  async function castVote(side: "a" | "b") {
    if (!battle) return;

    // only allow voting while live and timer not finished
    const remaining = msLeft(battle.ends_at);
    if (battle.status !== "live" || remaining <= 0) return;

    // local per-device cooldown (10s)
    const until = Date.now() + 10_000;
    setCooldownUntil(until);
    try {
      localStorage.setItem(`gv_cooldown_${room}`, String(until));
    } catch {}

    const field = side === "a" ? "a_votes" : "b_votes";
    const res = await supabase
      .from("battles")
      .update({ [field]: (battle as any)[field] + 1 })
      .eq("room_code", room)
      .select("*")
      .single();

    if (res.error) setErr(res.error.message);
  }

  useEffect(() => {
    // restore cooldown from localStorage
    try {
      const v = localStorage.getItem(`gv_cooldown_${room}`);
      if (v) setCooldownUntil(Number(v));
    } catch {}
  }, [room]);

  if (loading) return <main style={{ padding: 24 }}>Loading…</main>;

  if (err)
    return (
      <main style={{ padding: 24 }}>
        <h2>Room: {room}</h2>
        <p style={{ color: "tomato" }}>{err}</p>
        <p>
          If this says “permission denied” you need RLS policy allowing read/write to
          battles (we’ll do that next).
        </p>
      </main>
    );

  if (!battle)
    return (
      <main style={{ padding: 24 }}>
        <h2>Room: {room}</h2>
        <p>No battle row found.</p>
      </main>
    );

  const remainingMs = msLeft(battle.ends_at);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const total = battle.a_votes + battle.b_votes;
  const aPct = total === 0 ? 50 : Math.round((battle.a_votes / total) * 100);
  const bPct = 100 - aPct;

  return (
    <main style={{ padding: 24, maxWidth: 560, margin: "0 auto", fontFamily: "system-ui" }}>
      <h1 style={{ letterSpacing: 2 }}>GHOSTHAVN LIVEVOTE</h1>
      <p style={{ opacity: 0.8 }}>Room: <strong>{battle.room_code}</strong></p>

      <div style={{ padding: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,.15)", marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Timer</h2>
        <div style={{ fontSize: 42, fontWeight: 800 }}>
          {battle.status === "live" ? `${remainingSec}s` : "READY"}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button onClick={() => startBattle(120)} style={btn}>
            Start 2:00 (Reset votes)
          </button>
          <button onClick={() => startBattle(60)} style={btn}>
            Start 1:00 (Reset votes)
          </button>
          <button onClick={stopBattle} style={btn}>
            Stop
          </button>
        </div>

        <p style={{ opacity: 0.7, marginTop: 10 }}>
          Host buttons are visible to everyone right now. We’ll lock host with a PIN next.
        </p>
      </div>

      <div style={{ padding: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,.15)", marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Votes (live)</h2>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>{battle.rapper_a}</div>
            <div style={{ fontSize: 48, fontWeight: 900 }}>{battle.a_votes}</div>
          </div>
          <div style={{ flex: 1, textAlign: "right" }}>
            <div style={{ fontWeight: 700 }}>{battle.rapper_b}</div>
            <div style={{ fontSize: 48, fontWeight: 900 }}>{battle.b_votes}</div>
          </div>
        </div>

        <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,.12)", overflow: "hidden", marginTop: 10 }}>
          <div style={{ width: `${aPct}%`, height: "100%", background: "rgba(255,255,255,.55)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", opacity: 0.8, marginTop: 6 }}>
          <span>{aPct}%</span>
          <span>{bPct}%</span>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
          <button
            onClick={() => castVote("a")}
            disabled={!canVote || battle.status !== "live" || remainingMs <= 0}
            style={{ ...btn, flex: 1, opacity: !canVote ? 0.5 : 1 }}
          >
            Vote {battle.rapper_a}
          </button>
          <button
            onClick={() => castVote("b")}
            disabled={!canVote || battle.status !== "live" || remainingMs <= 0}
            style={{ ...btn, flex: 1, opacity: !canVote ? 0.5 : 1 }}
          >
            Vote {battle.rapper_b}
          </button>
        </div>

        <p style={{ opacity: 0.7, marginTop: 10 }}>
          Voting only works while LIVE and timer &gt; 0. One vote every 10s per device.
        </p>
      </div>
    </main>
  );
}

const btn: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,.2)",
  background: "rgba(255,255,255,.08)",
  color: "white",
  fontWeight: 700,
};
