"use client";

import { useEffect, useMemo, useState } from "react";

type VoteSide = "A" | "B";

export default function Page() {
  // Edit these for each battle:
  const EVENT_TITLE = "GHOSTHAVN LIVEVOTE";
  const SUBTITLE = "Live 1v1 rap battle voting";
  const POWERED = "Powered by Ghosthavn";

  // Change these names anytime:
  const [rapperA, setRapperA] = useState("Rapper A");
  const [rapperB, setRapperB] = useState("Rapper B");

  // Voting state (local, per-device)
  const [votesA, setVotesA] = useState(0);
  const [votesB, setVotesB] = useState(0);

  // Anti-spam: one vote per device every X seconds
  const COOLDOWN_SECONDS = 10;
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);

  // Optional: battle timer lock
  const BATTLE_MINUTES = 10;
  const [startTs, setStartTs] = useState<number>(() => Date.now());
  const endTs = useMemo(() => startTs + BATTLE_MINUTES * 60 * 1000, [startTs]);
  const [now, setNow] = useState(Date.now());

  const locked = now >= endTs;

  // Load from localStorage so refresh doesn't reset
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ghosthavn_livevote_state_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.votesA === "number") setVotesA(parsed.votesA);
        if (typeof parsed.votesB === "number") setVotesB(parsed.votesB);
        if (typeof parsed.cooldownUntil === "number") setCooldownUntil(parsed.cooldownUntil);
        if (typeof parsed.startTs === "number") setStartTs(parsed.startTs);
        if (typeof parsed.rapperA === "string") setRapperA(parsed.rapperA);
        if (typeof parsed.rapperB === "string") setRapperB(parsed.rapperB);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "ghosthavn_livevote_state_v1",
        JSON.stringify({ votesA, votesB, cooldownUntil, startTs, rapperA, rapperB })
      );
    } catch {}
  }, [votesA, votesB, cooldownUntil, startTs, rapperA, rapperB]);

  // Tick timer
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const total = votesA + votesB;
  const pctA = total === 0 ? 50 : Math.round((votesA / total) * 100);
  const pctB = 100 - pctA;

  const secondsLeft = Math.max(0, Math.floor((endTs - now) / 1000));
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const canVote = !locked && now >= cooldownUntil;

  function vote(side: VoteSide) {
    if (!canVote) return;

    if (side === "A") setVotesA((v) => v + 1);
    if (side === "B") setVotesB((v) => v + 1);

    setCooldownUntil(Date.now() + COOLDOWN_SECONDS * 1000);
  }

  function resetBattle() {
    if (!confirm("Reset battle? This clears votes on THIS device only.")) return;
    setVotesA(0);
    setVotesB(0);
    setCooldownUntil(0);
    setStartTs(Date.now());
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0b0b0f", color: "white" }}>
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "28px 16px 40px",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, letterSpacing: 1 }}>{EVENT_TITLE}</h1>
            <div style={{ opacity: 0.8, marginTop: 6 }}>{SUBTITLE}</div>
            <div style={{ opacity: 0.55, marginTop: 6 }}>{POWERED}</div>
          </div>

          <div
            style={{
              padding: "10px 12px",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              background: "rgba(255,255,255,0.04)",
              textAlign: "right",
              minWidth: 118,
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.7 }}>{locked ? "VOTING CLOSED" : "TIME LEFT"}</div>
            <div style={{ fontSize: 18, marginTop: 2, fontWeight: 700 }}>{mm}:{ss}</div>
          </div>
        </div>

        {/* Editable names */}
        <div
          style={{
            marginTop: 18,
            padding: 14,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Rapper A name</div>
              <input
                value={rapperA}
                onChange={(e) => setRapperA(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Rapper B name</div>
              <input
                value={rapperB}
                onChange={(e) => setRapperB(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ fontSize: 12, opacity: 0.55, marginTop: 10 }}>
            Tip: Change names here before the battle starts (this saves on your device).
          </div>
        </div>

        {/* Scoreboard */}
        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, opacity: 0.85 }}>
            <div>
              <div style={{ fontSize: 14 }}>{rapperA}</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{votesA}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14 }}>{rapperB}</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{votesB}</div>
            </div>
          </div>

          <div style={{ height: 14, borderRadius: 999, background: "rgba(255,255,255,0.10)", overflow: "hidden" }}>
            <div style={{ width: `${pctA}%`, height: "100%", background: "rgba(255,255,255,0.85)" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, opacity: 0.7 }}>
            <div>{pctA}%</div>
            <div>{pctB}%</div>
          </div>
        </div>

        {/* Vote buttons */}
        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button
            onClick={() => vote("A")}
            disabled={!canVote}
            style={{
              ...btnStyle,
              opacity: canVote ? 1 : 0.45,
            }}
          >
            🗳️ Vote {rapperA}
          </button>

          <button
            onClick={() => vote("B")}
            disabled={!canVote}
            style={{
              ...btnStyle,
              opacity: canVote ? 1 : 0.45,
            }}
          >
            🗳️ Vote {rapperB}
          </button>
        </div>

        {/* Cooldown + status */}
        <div style={{ marginTop: 12, fontSize: 13, opacity: 0.75 }}>
          {locked ? (
            <div>Voting is closed for this battle.</div>
          ) : canVote ? (
            <div>Tap a button to vote. One vote every {COOLDOWN_SECONDS}s per device.</div>
          ) : (
            <div>Hold up… cooldown active. Try again in a few seconds.</div>
          )}
        </div>

        {/* Admin-ish controls (local only) */}
        <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => setStartTs(Date.now())} style={smallBtn}>
            Restart Timer
          </button>
          <button onClick={resetBattle} style={smallBtn}>
            Reset Votes (This Device)
          </button>
        </div>

        <div style={{ marginTop: 18, fontSize: 12, opacity: 0.55, lineHeight: 1.45 }}>
          Note: This version stores votes on the viewer’s device (localStorage). If you want real global live voting
          across all phones at an event, next we’ll add a free database (Supabase) so every vote updates live for everyone.
        </div>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.25)",
  color: "white",
  outline: "none",
};

const btnStyle: React.CSSProperties = {
  padding: "14px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  fontSize: 16,
  fontWeight: 700,
};

const smallBtn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  fontSize: 13,
  fontWeight: 700,
};
