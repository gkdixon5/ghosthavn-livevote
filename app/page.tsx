"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

const LS = {
  pin: "ghv_host_pin",
  names: "ghv_names",
  votes: "ghv_votes",
  endAt: "ghv_end_at",
  durationSec: "ghv_duration_sec",
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function fmtTimeLeft(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

type Names = { a: string; b: string };
type Votes = { a: number; b: number };

export default function Page() {
  // ---------- base state ----------
  const [names, setNames] = useState<Names>({ a: "Rapper A", b: "Rapper B" });
  const [votes, setVotes] = useState<Votes>({ a: 0, b: 0 });

  // ---------- timer ----------
  const [durationSec, setDurationSec] = useState<number>(10 * 60); // 10 min default
  const [endAt, setEndAt] = useState<number | null>(null);
  const [, forceTick] = useState(0);
  const tickRef = useRef<number | null>(null);

  // ---------- host-only ----------
  const [hostPanelOpen, setHostPanelOpen] = useState(false);
  const [pinExists, setPinExists] = useState(false);
  const [createPin, setCreatePin] = useState("");
  const [createPin2, setCreatePin2] = useState("");
  const [enterPin, setEnterPin] = useState("");
  const [hostUnlocked, setHostUnlocked] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // ---------- vote cooldown (per device) ----------
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const cooldownMs = 10_000;

  // ---------- load from localStorage ----------
  useEffect(() => {
    try {
      const p = localStorage.getItem(LS.pin);
      setPinExists(!!p);

      const nRaw = localStorage.getItem(LS.names);
      if (nRaw) setNames(JSON.parse(nRaw));

      const vRaw = localStorage.getItem(LS.votes);
      if (vRaw) setVotes(JSON.parse(vRaw));

      const eRaw = localStorage.getItem(LS.endAt);
      if (eRaw) setEndAt(Number(eRaw) || null);

      const dRaw = localStorage.getItem(LS.durationSec);
      if (dRaw) setDurationSec(Number(dRaw) || 10 * 60);
    } catch {
      // ignore
    }
  }, []);

  // ---------- persist ----------
  useEffect(() => {
    try {
      localStorage.setItem(LS.names, JSON.stringify(names));
    } catch {}
  }, [names]);

  useEffect(() => {
    try {
      localStorage.setItem(LS.votes, JSON.stringify(votes));
    } catch {}
  }, [votes]);

  useEffect(() => {
    try {
      localStorage.setItem(LS.durationSec, String(durationSec));
    } catch {}
  }, [durationSec]);

  useEffect(() => {
    try {
      if (endAt) localStorage.setItem(LS.endAt, String(endAt));
      else localStorage.removeItem(LS.endAt);
    } catch {}
  }, [endAt]);

  // ---------- ticking ----------
  useEffect(() => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => forceTick((x) => x + 1), 250);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, []);

  const now = Date.now();
  const timeLeftMs = endAt ? endAt - now : durationSec * 1000;
  const running = endAt !== null && timeLeftMs > 0;

  // ---------- derived ----------
  const totalVotes = votes.a + votes.b;
  const pctA = totalVotes === 0 ? 50 : Math.round((votes.a / totalVotes) * 100);
  const pctB = 100 - pctA;

  const canVote = now >= cooldownUntil && running; // only allow voting while timer running

  // ---------- actions ----------
  function vote(side: "a" | "b") {
    if (!canVote) return;
    setVotes((v) => ({ ...v, [side]: v[side] + 1 }));
    setCooldownUntil(Date.now() + cooldownMs);
  }

  function resetVotesAll() {
    setVotes({ a: 0, b: 0 });
  }

  function startTimer() {
    const safe = clamp(durationSec, 30, 60 * 60); // 30s to 60m
    setDurationSec(safe);
    setEndAt(Date.now() + safe * 1000);
  }

  function resetTimer() {
    setEndAt(null);
  }

  // ---------- host PIN flow ----------
  function handleCreatePin() {
    setPinError(null);
    const a = createPin.trim();
    const b = createPin2.trim();

    if (a.length < 4) {
      setPinError("PIN must be at least 4 digits/characters.");
      return;
    }
    if (a !== b) {
      setPinError("PINs do not match.");
      return;
    }

    try {
      localStorage.setItem(LS.pin, a);
      setPinExists(true);
      setHostUnlocked(true);
      setCreatePin("");
      setCreatePin2("");
      setEnterPin("");
      setPinError(null);
    } catch {
      setPinError("Could not save PIN on this device.");
    }
  }

  function handleUnlock() {
    setPinError(null);
    const stored = localStorage.getItem(LS.pin) || "";
    if (!stored) {
      setPinError("No PIN set yet. Create one first.");
      return;
    }
    if (enterPin.trim() !== stored) {
      setPinError("Wrong PIN.");
      return;
    }
    setHostUnlocked(true);
    setEnterPin("");
  }

  function handleLock() {
    setHostUnlocked(false);
    setEnterPin("");
    setPinError(null);
  }

  function handleChangePin(newPin: string) {
    const clean = newPin.trim();
    if (clean.length < 4) {
      setPinError("New PIN must be at least 4 characters.");
      return;
    }
    try {
      localStorage.setItem(LS.pin, clean);
      setPinError(null);
    } catch {
      setPinError("Could not update PIN.");
    }
  }

  // ---------- styles ----------
  const bgStyle: React.CSSProperties = {
    minHeight: "100vh",
    color: "white",
    background:
      "radial-gradient(1200px 600px at 20% 10%, rgba(140, 90, 255, 0.18), transparent 60%), radial-gradient(900px 600px at 80% 20%, rgba(0, 200, 255, 0.10), transparent 60%), #07070b",
    padding: "24px 16px 64px",
    display: "flex",
    justifyContent: "center",
  };

  const shellStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 520,
  };

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
    backdropFilter: "blur(10px)",
  };

  const pill: React.CSSProperties = {
    display: "inline-flex",
    gap: 8,
    alignItems: "center",
    padding: "8px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.10)",
    fontSize: 13,
    color: "rgba(255,255,255,0.82)",
  };

  const input: React.CSSProperties = {
    width: "100%",
    padding: "14px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    outline: "none",
    fontSize: 16,
  };

  const btn: React.CSSProperties = {
    width: "100%",
    padding: "14px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.10)",
    color: "white",
    fontWeight: 700,
    fontSize: 16,
  };

  const btnSmall: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.10)",
    color: "white",
    fontWeight: 700,
    fontSize: 14,
  };

  const voteBtn: React.CSSProperties = {
    width: "100%",
    padding: "14px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.10)",
    color: "white",
    fontWeight: 800,
    fontSize: 18, // smaller so it won’t feel huge
    letterSpacing: 0.2,
  };

  const muted: React.CSSProperties = { color: "rgba(255,255,255,0.70)" };

  return (
    <main style={bgStyle}>
      <div style={shellStyle}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 0.95, letterSpacing: -1 }}>
              GHOSTHAVN
              <br />
              LIVEVOTE
            </div>
            <div style={{ marginTop: 10, fontSize: 18, ...muted }}>Live 1v1 rap battle voting</div>
            <div style={{ marginTop: 4, fontSize: 18, ...muted }}>Powered by Ghosthavn</div>
          </div>

          <div style={{ minWidth: 150, ...card, padding: 14 }}>
            <div style={{ ...muted, fontSize: 13, fontWeight: 700, textAlign: "center" }}>TIME LEFT</div>
            <div style={{ fontSize: 40, fontWeight: 900, textAlign: "center", marginTop: 4 }}>
              {fmtTimeLeft(timeLeftMs)}
            </div>
          </div>
        </div>

        {/* HOST PANEL */}
        <div style={{ marginTop: 18, ...card }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={pill}>Host controls</div>
            <button
              style={{ ...btnSmall, width: "auto" }}
              onClick={() => setHostPanelOpen((v) => !v)}
            >
              {hostPanelOpen ? "Hide" : "Show"}
            </button>
          </div>

          {hostPanelOpen && (
            <div style={{ marginTop: 14 }}>
              {!pinExists ? (
                <>
                  <div style={{ ...muted, fontSize: 14, marginBottom: 10 }}>
                    First time setup (host device): create a PIN.
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    <input
                      style={input}
                      placeholder="Create host PIN (min 4 chars)"
                      value={createPin}
                      onChange={(e) => setCreatePin(e.target.value)}
                    />
                    <input
                      style={input}
                      placeholder="Confirm host PIN"
                      value={createPin2}
                      onChange={(e) => setCreatePin2(e.target.value)}
                    />
                    <button style={btn} onClick={handleCreatePin}>
                      Set PIN & Unlock
                    </button>
                  </div>
                </>
              ) : !hostUnlocked ? (
                <>
                  <div style={{ ...muted, fontSize: 14, marginBottom: 10 }}>
                    Enter PIN to unlock host-only controls.
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    <input
                      style={input}
                      placeholder="Enter host PIN"
                      value={enterPin}
                      onChange={(e) => setEnterPin(e.target.value)}
                    />
                    <button style={btn} onClick={handleUnlock}>
                      Unlock
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={pill}>Unlocked</div>
                    <button style={{ ...btnSmall, width: "auto" }} onClick={handleLock}>
                      Lock
                    </button>
                    <button
                      style={{ ...btnSmall, width: "auto" }}
                      onClick={() => {
                        const p = prompt("Set a new host PIN (min 4 chars):");
                        if (p != null) handleChangePin(p);
                      }}
                    >
                      Change PIN
                    </button>
                  </div>

                  <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                    <div style={{ ...card, padding: 14 }}>
                      <div style={{ fontWeight: 800, marginBottom: 10 }}>Battle controls</div>

                      <div style={{ display: "grid", gap: 10 }}>
                        <div>
                          <div style={{ ...muted, fontSize: 13, marginBottom: 6 }}>Duration (minutes)</div>
                          <input
                            style={input}
                            inputMode="numeric"
                            value={Math.round(durationSec / 60)}
                            onChange={(e) => {
                              const m = Number(e.target.value || 0);
                              setDurationSec(clamp(m, 1, 60) * 60);
                            }}
                          />
                        </div>

                        <div style={{ display: "flex", gap: 10 }}>
                          <button style={{ ...btnSmall, flex: 1 }} onClick={startTimer}>
                            Start battle
                          </button>
                          <button style={{ ...btnSmall, flex: 1 }} onClick={resetTimer}>
                            Reset timer
                          </button>
                        </div>

                        <div style={{ display: "flex", gap: 10 }}>
                          <button style={{ ...btnSmall, flex: 1 }} onClick={resetVotesAll}>
                            Reset votes
                          </button>
                        </div>
                      </div>

                      <div style={{ ...muted, fontSize: 13, marginTop: 10 }}>
                        Tip: Start battle right when the round begins. (Without a database, timer isn’t synced across phones.)
                      </div>
                    </div>

                    <div style={{ ...card, padding: 14 }}>
                      <div style={{ fontWeight: 800, marginBottom: 10 }}>Rapper names</div>
                      <div style={{ display: "grid", gap: 10 }}>
                        <div>
                          <div style={{ ...muted, fontSize: 13, marginBottom: 6 }}>Rapper A</div>
                          <input
                            style={input}
                            value={names.a}
                            onChange={(e) => setNames((n) => ({ ...n, a: e.target.value }))}
                          />
                        </div>

                        <div>
                          <div style={{ ...muted, fontSize: 13, marginBottom: 6 }}>Rapper B</div>
                          <input
                            style={input}
                            value={names.b}
                            onChange={(e) => setNames((n) => ({ ...n, b: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div style={{ ...muted, fontSize: 13, marginTop: 10 }}>
                        Viewers cannot edit names — host-only.
                      </div>
                    </div>
                  </div>
                </>
              )}

              {pinError && (
                <div style={{ marginTop: 12, color: "rgba(255,120,120,0.95)", fontWeight: 700 }}>
                  {pinError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SCORE */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{names.a}</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{names.b}</div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1 }}>{votes.a}</div>
            <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1 }}>{votes.b}</div>
          </div>

          {/* bar */}
          <div
            style={{
              height: 14,
              borderRadius: 999,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.12)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${pctA}%`,
                background: "rgba(255,255,255,0.60)",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, ...muted }}>
            <div>{pctA}%</div>
            <div>{pctB}%</div>
          </div>
        </div>

        {/* VOTE BUTTONS */}
        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <button
            style={{
              ...voteBtn,
              opacity: canVote ? 1 : 0.55,
            }}
            onClick={() => vote("a")}
          >
            Vote {names.a}
          </button>

          <button
            style={{
              ...voteBtn,
              opacity: canVote ? 1 : 0.55,
            }}
            onClick={() => vote("b")}
          >
            Vote {names.b}
          </button>

          <div style={{ ...muted, fontSize: 13 }}>
            {running
              ? canVote
                ? "Tap a button to vote. One vote every 10s per device."
                : "Hold up… cooldown active. Try again in a few seconds."
              : "Battle not started. Waiting for host to start the timer."}
          </div>
        </div>

        <div style={{ marginTop: 16, ...muted, fontSize: 13 }}>
          Note: This version stores votes on the viewer’s device (localStorage). If you want real global live voting + synced timer across
          all phones, next step is adding a free database (Supabase).
        </div>
      </div>
    </main>
  );
          }
