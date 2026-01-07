"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const HOST_PIN = "8520"; // <- change this to whatever you want

type Names = { a: string; b: string };
type Votes = { a: number; b: number };

const DEFAULT_NAMES: Names = { a: "Rapper A", b: "Rapper B" };

function clampName(s: string) {
  return s.replace(/\s+/g, " ").trim().slice(0, 26);
}

export default function Page() {
  // Host lock/unlock
  const [pin, setPin] = useState("");
  const [hostUnlocked, setHostUnlocked] = useState(false);

  // Names (saved per device)
  const [names, setNames] = useState<Names>(DEFAULT_NAMES);

  // Votes (saved per device)
  const [votes, setVotes] = useState<Votes>({ a: 0, b: 0 });

  // Timer (local only)
  const DURATION_SEC = 10 * 60;
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number>(Date.now());

  // Cooldown per device
  const COOLDOWN_MS = 10_000;
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);

  const intervalRef = useRef<number | null>(null);

  // Load localStorage
  useEffect(() => {
    try {
      const savedNames = localStorage.getItem("gh_names");
      if (savedNames) setNames(JSON.parse(savedNames));

      const savedVotes = localStorage.getItem("gh_votes");
      if (savedVotes) setVotes(JSON.parse(savedVotes));

      const savedEndsAt = localStorage.getItem("gh_endsAt");
      if (savedEndsAt) setEndsAt(Number(savedEndsAt));

      const savedCooldown = localStorage.getItem("gh_cooldownUntil");
      if (savedCooldown) setCooldownUntil(Number(savedCooldown));
    } catch {}
  }, []);

  // Persist names/votes/timer
  useEffect(() => {
    try {
      localStorage.setItem("gh_names", JSON.stringify(names));
    } catch {}
  }, [names]);

  useEffect(() => {
    try {
      localStorage.setItem("gh_votes", JSON.stringify(votes));
    } catch {}
  }, [votes]);

  useEffect(() => {
    try {
      if (endsAt === null) localStorage.removeItem("gh_endsAt");
      else localStorage.setItem("gh_endsAt", String(endsAt));
    } catch {}
  }, [endsAt]);

  useEffect(() => {
    try {
      localStorage.setItem("gh_cooldownUntil", String(cooldownUntil));
    } catch {}
  }, [cooldownUntil]);

  // Tick timer
  useEffect(() => {
    intervalRef.current = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, []);

  const timeLeftSec = useMemo(() => {
    if (!endsAt) return DURATION_SEC;
    const diff = Math.max(0, Math.floor((endsAt - nowMs) / 1000));
    return diff;
  }, [endsAt, nowMs]);

  const mm = String(Math.floor(timeLeftSec / 60)).padStart(2, "0");
  const ss = String(timeLeftSec % 60).padStart(2, "0");

  const totalVotes = votes.a + votes.b;
  const pctA = totalVotes === 0 ? 50 : Math.round((votes.a / totalVotes) * 100);
  const pctB = 100 - pctA;

  const canVote = nowMs >= cooldownUntil;

  function unlockHost() {
    if (pin === HOST_PIN) setHostUnlocked(true);
  }

  function startBattle() {
    setEndsAt(Date.now() + DURATION_SEC * 1000);
  }

  function resetVotesThisDevice() {
    setVotes({ a: 0, b: 0 });
  }

  function vote(side: "a" | "b") {
    if (!canVote) return;
    setVotes((v) => ({ ...v, [side]: v[side] + 1 }));
    setCooldownUntil(Date.now() + COOLDOWN_MS);
  }

  return (
    <main className="wrap">
      <header className="top">
        <div>
          <h1>GHOSTHAVN<br />LIVEVOTE</h1>
          <div className="sub">Live 1v1 rap battle voting<br />Powered by Ghosthavn</div>
        </div>

        <div className="timerCard">
          <div className="timerLabel">TIME LEFT</div>
          <div className="timerValue">{mm}:{ss}</div>
        </div>
      </header>

      <section className="card hostCard">
        <div className="pill">Host controls</div>

        <div className="row">
          <input
            className="input"
            placeholder="Enter host PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            inputMode="numeric"
          />
          <button className="btn" onClick={unlockHost}>
            Unlock
          </button>
        </div>

        <div className="hint">
          Names + admin buttons stay locked for everyone until host unlocks.
        </div>

        {hostUnlocked && (
          <div className="hostActions">
            <button className="btn" onClick={startBattle}>
              Start Battle
            </button>
            <button className="btn ghost" onClick={resetVotesThisDevice}>
              Reset Votes (This Device)
            </button>
          </div>
        )}
      </section>

      <section className="card">
        <div className="grid2">
          <div>
            <div className="label">Rapper A name</div>
            <input
              className="input"
              value={names.a}
              disabled={!hostUnlocked}
              onChange={(e) => setNames((n) => ({ ...n, a: clampName(e.target.value) }))}
            />
          </div>

          <div>
            <div className="label">Rapper B name</div>
            <input
              className="input"
              value={names.b}
              disabled={!hostUnlocked}
              onChange={(e) => setNames((n) => ({ ...n, b: clampName(e.target.value) }))}
            />
          </div>
        </div>

        {!hostUnlocked && (
          <div className="hint">
            Names are locked. Only the host PIN can edit them.
          </div>
        )}
      </section>

      <section className="scoreRow">
        <div className="scoreSide">
          <div className="scoreName">{names.a}</div>
          <div className="scoreNum">{votes.a}</div>
        </div>

        <div className="scoreSide right">
          <div className="scoreName">{names.b}</div>
          <div className="scoreNum">{votes.b}</div>
        </div>
      </section>

      <section className="barWrap">
        <div className="bar">
          <div className="barFill" style={{ width: `${pctA}%` }} />
        </div>
        <div className="barLabels">
          <span>{pctA}%</span>
          <span>{pctB}%</span>
        </div>
      </section>

      <section className="voteRow">
        <button className="voteBtn" onClick={() => vote("a")} disabled={!canVote}>
          📦 Vote {names.a}
        </button>
        <button className="voteBtn" onClick={() => vote("b")} disabled={!canVote}>
          📦 Vote {names.b}
        </button>
      </section>

      <div className="cooldown">
        {canVote ? "Tap a button to vote. One vote every 10s per device."
          : "Hold up… cooldown active. Try again in a few seconds."}
      </div>

      <section className="footerActions">
        <button className="btn ghost" onClick={startBattle}>
          Restart Timer (This Device)
        </button>
        <button className="btn ghost" onClick={resetVotesThisDevice}>
          Reset Votes (This Device)
        </button>
      </section>

      <div className="note">
        Note: This version stores votes on the viewer’s device (localStorage).
        If you want real global live voting across all phones, next we’ll add a free database (Supabase).
      </div>

      <style jsx>{`
        .wrap {
          max-width: 920px;
          margin: 0 auto;
          padding: 28px 18px 44px;
        }
        .top {
          display: flex;
          gap: 18px;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
        }
        h1 {
          margin: 0;
          font-size: 44px;
          line-height: 0.95;
          letter-spacing: 0.5px;
        }
        .sub {
          margin-top: 10px;
          color: rgba(255,255,255,0.75);
          font-size: 16px;
          line-height: 1.4;
        }
        .timerCard {
          min-width: 220px;
          border-radius: 20px;
          padding: 14px 16px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
          box-shadow: 0 12px 40px rgba(0,0,0,0.35);
        }
        .timerLabel {
          font-size: 12px;
          letter-spacing: 1.4px;
          opacity: 0.7;
        }
        .timerValue {
          margin-top: 4px;
          font-size: 40px;
          font-weight: 800;
        }

        .card {
          margin-top: 18px;
          border-radius: 22px;
          padding: 18px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
          box-shadow: 0 12px 40px rgba(0,0,0,0.35);
        }
        .hostCard { margin-top: 16px; }
        .pill {
          display: inline-block;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          font-weight: 700;
          margin-bottom: 10px;
        }
        .row {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .input {
          flex: 1;
          height: 46px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(0,0,0,0.35);
          color: #fff;
          padding: 0 14px;
          outline: none;
          font-size: 16px;
        }
        .input:disabled {
          opacity: 0.55;
        }
        .btn {
          height: 46px;
          padding: 0 14px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.10);
          color: #fff;
          font-weight: 800;
          cursor: pointer;
        }
        .btn.ghost {
          background: rgba(255,255,255,0.06);
        }
        .hint {
          margin-top: 10px;
          color: rgba(255,255,255,0.70);
          font-size: 14px;
          line-height: 1.35;
        }
        .hostActions {
          margin-top: 12px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .label {
          margin-bottom: 8px;
          color: rgba(255,255,255,0.70);
          font-size: 14px;
        }

        .scoreRow {
          margin-top: 18px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 14px;
        }
        .scoreSide {
          min-width: 0;
        }
        .scoreSide.right { text-align: right; }
        .scoreName {
          color: rgba(255,255,255,0.82);
          font-size: 22px;
          font-weight: 700;
          margin-bottom: 6px;
          word-break: break-word;
        }
        .scoreNum {
          font-size: 64px;
          font-weight: 900;
          line-height: 1;
        }

        .barWrap {
          margin-top: 12px;
        }
        .bar {
          height: 18px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.12);
        }
        .barFill {
          height: 100%;
          background: rgba(255,255,255,0.85);
        }
        .barLabels {
          margin-top: 8px;
          display: flex;
          justify-content: space-between;
          color: rgba(255,255,255,0.70);
          font-size: 14px;
        }

        .voteRow {
          margin-top: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        /* Smaller vote buttons (no overlap) */
        .voteBtn {
          height: 54px;
          padding: 0 12px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.10);
          color: #fff;
          font-weight: 900;
          font-size: 16px;
          cursor: pointer;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .voteBtn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .cooldown {
          margin-top: 10px;
          color: rgba(255,255,255,0.70);
          font-size: 14px;
          text-align: center;
        }

        .footerActions {
          margin-top: 16px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .note {
          margin-top: 12px;
          color: rgba(255,255,255,0.55);
          font-size: 13px;
          text-align: center;
          line-height: 1.35;
        }

        @media (max-width: 720px) {
          .grid2 { grid-template-columns: 1fr; }
          h1 { font-size: 40px; }
          .timerValue { font-size: 36px; }
          .scoreNum { font-size: 56px; }
        }
      `}</style>
    </main>
  );
}
