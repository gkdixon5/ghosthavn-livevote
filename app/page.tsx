"use client";

import { useEffect, useState } from "react";

type VoteState = {
  a: number;
  b: number;
  endsAt: number; // epoch ms
  durationSec: number;
  nameA: string;
  nameB: string;
  hostUnlocked: boolean;
};

const STORAGE_KEY = "ghosthavn_livevote_v2";
const DEFAULT_DURATION = 10 * 60; // 10 minutes

export default function Home() {
  const [pinInput, setPinInput] = useState("");
  const [hostPin, setHostPin] = useState("1122"); // CHANGE PIN HERE

  const [cooldownUntil, setCooldownUntil] = useState(0);

  const [state, setState] = useState<VoteState>({
    a: 0,
    b: 0,
    durationSec: DEFAULT_DURATION,
    endsAt: Date.now() + DEFAULT_DURATION * 1000,
    nameA: "Rapper A",
    nameB: "Rapper B",
    hostUnlocked: false,
  });

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<VoteState> & { hostPin?: string };
      setState((s) => ({
        ...s,
        ...parsed,
        hostUnlocked: false, // always start locked on reload for safety
        durationSec: parsed.durationSec ?? s.durationSec,
        endsAt: parsed.endsAt ?? s.endsAt,
        nameA: parsed.nameA ?? s.nameA,
        nameB: parsed.nameB ?? s.nameB,
        a: parsed.a ?? s.a,
        b: parsed.b ?? s.b,
      }));
      if (parsed.hostPin) setHostPin(parsed.hostPin);
    } catch {}
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...state,
          hostPin,
        })
      );
    } catch {}
  }, [state, hostPin]);

  // Countdown ticker
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const secondsLeft = Math.max(0, Math.ceil((state.endsAt - now) / 1000));
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const total = state.a + state.b;
  const pctA = total === 0 ? 50 : Math.round((state.a / total) * 100);
  const pctB = 100 - pctA;

  const canVote = Date.now() >= cooldownUntil;
  const host = state.hostUnlocked;

  function vote(which: "a" | "b") {
    if (!canVote) return;
    setState((s) => ({
      ...s,
      a: which === "a" ? s.a + 1 : s.a,
      b: which === "b" ? s.b + 1 : s.b,
    }));
    // 3s cooldown per device
    setCooldownUntil(Date.now() + 3000);
  }

  function restartTimer() {
    setState((s) => ({
      ...s,
      endsAt: Date.now() + s.durationSec * 1000,
    }));
  }

  function resetVotesThisDevice() {
    setState((s) => ({ ...s, a: 0, b: 0 }));
  }

  function unlockHost() {
    if (pinInput.trim() === hostPin.trim()) {
      setState((s) => ({ ...s, hostUnlocked: true }));
      setPinInput("");
    } else {
      alert("Wrong PIN");
    }
  }

  function lockHost() {
    setState((s) => ({ ...s, hostUnlocked: false }));
  }

  return (
    <main className="wrap">
      <div className="container">
        {/* Header */}
        <div className="top">
          <div>
            <div className="title">
              GHOSTHAVN
              <br />
              LIVEVOTE
            </div>
            <div className="sub">
              Live 1v1 rap battle voting
              <br />
              Powered by Ghosthavn
            </div>
          </div>

          <div className="timerCard">
            <div className="timerLabel">TIME LEFT</div>
            <div className="timerValue">
              {mm}:{ss}
            </div>
          </div>
        </div>

        {/* Host PIN */}
        <div className="card">
          {!host ? (
            <div className="row">
              <div className="badge">Host controls</div>
              <input
                className="input"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter host PIN"
              />
              <button className="btn" onClick={unlockHost}>
                Unlock
              </button>
              <div className="muted small">
                Names + admin buttons stay locked for everyone until host unlocks.
              </div>
            </div>
          ) : (
            <div className="row">
              <div className="badge ok">HOST UNLOCKED</div>
              <button className="btn" onClick={lockHost}>
                Lock
              </button>
              <div className="spacer" />
              <button className="btn" onClick={restartTimer}>
                Restart Timer
              </button>
              <button className="btn" onClick={resetVotesThisDevice}>
                Reset Votes (This Device)
              </button>
            </div>
          )}
        </div>

        {/* Names (FIXED sizing / no overlap) */}
        <div className="card">
          <div className="names">
            <div>
              <div className="label">Rapper A name</div>
              <input
                className="input"
                value={state.nameA}
                readOnly={!host}
                onChange={(e) => setState((s) => ({ ...s, nameA: e.target.value }))}
              />
            </div>
            <div>
              <div className="label">Rapper B name</div>
              <input
                className="input"
                value={state.nameB}
                readOnly={!host}
                onChange={(e) => setState((s) => ({ ...s, nameB: e.target.value }))}
              />
            </div>
          </div>

          {!host && (
            <div className="muted small" style={{ marginTop: 10 }}>
              Names are locked. Only the host PIN can edit them.
            </div>
          )}
        </div>

        {/* Score */}
        <div className="scoreRow">
          <div>
            <div className="scoreName">{state.nameA}</div>
            <div className="scoreNum">{state.a}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="scoreName">{state.nameB}</div>
            <div className="scoreNum">{state.b}</div>
          </div>
        </div>

        {/* Bar */}
        <div className="bar">
          <div className="barFill" style={{ width: `${pctA}%` }} />
        </div>
        <div className="barLabels">
          <div>{pctA}%</div>
          <div>{pctB}%</div>
        </div>

        {/* Vote buttons */}
        <div className="voteRow">
          <button className={`voteBtn ${canVote ? "" : "disabled"}`} onClick={() => vote("a")}>
            Vote {state.nameA}
          </button>
          <button className={`voteBtn ${canVote ? "" : "disabled"}`} onClick={() => vote("b")}>
            Vote {state.nameB}
          </button>
        </div>

        {!canVote && <div className="muted">Cooldown… try again in a moment.</div>}

        <div className="muted small" style={{ marginTop: 10 }}>
          Note: This version stores votes on each device (localStorage). For real shared live voting across all phones, we’ll add Supabase.
        </div>
      </div>

      {/* CSS */}
      <style jsx>{`
        .wrap {
          min-height: 100vh;
          padding: 16px;
          background: radial-gradient(900px 600px at 10% 0%, rgba(120, 120, 255, 0.12), transparent 60%),
            radial-gradient(900px 500px at 90% 20%, rgba(255, 120, 180, 0.1), transparent 55%),
            #07070b;
          color: #fff;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
        }
        .container {
          max-width: 780px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .top {
          display: flex;
          gap: 12px;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
        }
        .title {
          font-size: 44px;
          font-weight: 900;
          letter-spacing: 1px;
          line-height: 0.95;
        }
        .sub {
          opacity: 0.8;
          margin-top: 10px;
          font-size: 16px;
        }
        .timerCard {
          padding: 12px 14px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          min-width: 170px;
          text-align: right;
        }
        .timerLabel {
          font-size: 12px;
          opacity: 0.75;
        }
        .timerValue {
          font-size: 34px;
          font-weight: 900;
        }
        .card {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          border-radius: 16px;
          padding: 14px;
        }
        .row {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .spacer {
          flex: 1;
        }
        .badge {
          font-weight: 800;
          font-size: 13px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(0, 0, 0, 0.25);
        }
        .badge.ok {
          color: #b6ffcc;
        }
        .label {
          font-size: 13px;
          opacity: 0.75;
          margin-bottom: 6px;
        }
        .input {
          width: 100%;
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(0, 0, 0, 0.25);
          color: #fff;
          outline: none;
          min-width: 180px;
        }
        .btn {
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          font-weight: 800;
          cursor: pointer;
        }
        .muted {
          opacity: 0.75;
        }
        .small {
          font-size: 13px;
        }

        /* THIS fixes the overlap: on mobile it becomes stacked */
        .names {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 560px) {
          .names {
            grid-template-columns: 1fr;
          }
          .title {
            font-size: 38px;
          }
        }

        .scoreRow {
          display: flex;
          justify-content: space-between;
          padding: 0 6px;
          margin-top: 2px;
        }
        .scoreName {
          font-size: 16px;
          opacity: 0.85;
        }
        .scoreNum {
          font-size: 52px;
          font-weight: 900;
          line-height: 1;
        }
        .bar {
          height: 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }
        .barFill {
          height: 100%;
          background: rgba(255, 255, 255, 0.85);
        }
        .barLabels {
          display: flex;
          justify-content: space-between;
          opacity: 0.75;
          margin-top: 6px;
        }
        .voteRow {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 560px) {
          .voteRow {
            grid-template-columns: 1fr;
          }
        }
        .voteBtn {
          padding: 16px 14px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          font-size: 18px;
          font-weight: 900;
          cursor: pointer;
        }
        .voteBtn.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </main>
  );
}
