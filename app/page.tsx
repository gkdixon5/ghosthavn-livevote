"use client";

import React, { useEffect, useMemo, useState } from "react";

const LS = {
  hostPin: "ghv_host_pin",
  names: "ghv_names",
  votes: "ghv_votes",
  timerEndAt: "ghv_timer_end_at",
  durationSec: "ghv_duration_sec",
  lastVoteAt: "ghv_last_vote_at",
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function nowMs() {
  return Date.now();
}

function formatMMSS(totalSec: number) {
  const s = clamp(Math.floor(totalSec), 0, 99 * 60 + 59);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

type Names = { a: string; b: string };
type Votes = { a: number; b: number };

const DEFAULT_NAMES: Names = { a: "Rapper A", b: "Rapper B" };
const DEFAULT_VOTES: Votes = { a: 0, b: 0 };
const DEFAULT_DURATION = 10 * 60; // 10 minutes
const VOTE_COOLDOWN_SEC = 10;

export default function Page() {
  const [mounted, setMounted] = useState(false);

  // core state
  const [names, setNames] = useState<Names>(DEFAULT_NAMES);
  const [votes, setVotes] = useState<Votes>(DEFAULT_VOTES);
  const [durationSec, setDurationSec] = useState<number>(DEFAULT_DURATION);
  const [endAt, setEndAt] = useState<number | null>(null); // epoch ms
  const [tick, setTick] = useState(0);

  // host auth
  const [hostPinExists, setHostPinExists] = useState(false);
  const [isHostUnlocked, setIsHostUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");

  // helper to read/write LS safely
  const ls = useMemo(() => {
    return {
      get<T>(key: string, fallback: T): T {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) return fallback;
          return JSON.parse(raw) as T;
        } catch {
          return fallback;
        }
      },
      set<T>(key: string, val: T) {
        try {
          localStorage.setItem(key, JSON.stringify(val));
        } catch {}
      },
      getStr(key: string, fallback = "") {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) return fallback;
          return raw;
        } catch {
          return fallback;
        }
      },
      setStr(key: string, val: string) {
        try {
          localStorage.setItem(key, val);
        } catch {}
      },
      remove(key: string) {
        try {
          localStorage.removeItem(key);
        } catch {}
      },
    };
  }, []);

  // load from localStorage once
  useEffect(() => {
    setMounted(true);

    const savedNames = ls.get<Names>(LS.names, DEFAULT_NAMES);
    const savedVotes = ls.get<Votes>(LS.votes, DEFAULT_VOTES);
    const savedDuration = ls.get<number>(LS.durationSec, DEFAULT_DURATION);
    const savedEndAt = ls.get<number | null>(LS.timerEndAt, null);

    setNames(savedNames);
    setVotes(savedVotes);
    setDurationSec(savedDuration);
    setEndAt(savedEndAt);

    const pin = ls.getStr(LS.hostPin, "");
    setHostPinExists(!!pin);
    setIsHostUnlocked(false);
    setPinInput("");

    // tick timer UI
    const id = window.setInterval(() => setTick((t) => t + 1), 250);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // save changes
  useEffect(() => {
    if (!mounted) return;
    ls.set(LS.names, names);
  }, [mounted, names, ls]);

  useEffect(() => {
    if (!mounted) return;
    ls.set(LS.votes, votes);
  }, [mounted, votes, ls]);

  useEffect(() => {
    if (!mounted) return;
    ls.set(LS.durationSec, durationSec);
  }, [mounted, durationSec, ls]);

  useEffect(() => {
    if (!mounted) return;
    ls.set(LS.timerEndAt, endAt);
  }, [mounted, endAt, ls]);

  // timer values
  const timeLeftSec = useMemo(() => {
    if (!endAt) return durationSec;
    const diff = Math.ceil((endAt - nowMs()) / 1000);
    return clamp(diff, 0, durationSec);
  }, [endAt, durationSec, tick]);

  const totalVotes = votes.a + votes.b;
  const pctA = totalVotes === 0 ? 50 : Math.round((votes.a / totalVotes) * 100);
  const pctB = 100 - pctA;

  // vote cooldown per device
  const [cooldownLeft, setCooldownLeft] = useState(0);
  useEffect(() => {
    if (!mounted) return;

    const id = window.setInterval(() => {
      const last = ls.get<number>(LS.lastVoteAt, 0);
      const elapsed = Math.floor((nowMs() - last) / 1000);
      const left = clamp(VOTE_COOLDOWN_SEC - elapsed, 0, VOTE_COOLDOWN_SEC);
      setCooldownLeft(left);
    }, 250);

    return () => window.clearInterval(id);
  }, [mounted, ls]);

  function canVote() {
    return cooldownLeft === 0 && (endAt ? nowMs() < endAt : true);
  }

  function voteFor(side: "a" | "b") {
    if (!canVote()) return;
    setVotes((v) => ({ ...v, [side]: v[side] + 1 }));
    ls.set(LS.lastVoteAt, nowMs());
    setCooldownLeft(VOTE_COOLDOWN_SEC);
  }

  // host actions
  function createHostPin() {
    const p = pinInput.trim();
    if (p.length < 4) return;
    ls.setStr(LS.hostPin, p);
    setHostPinExists(true);
    setIsHostUnlocked(true);
    setPinInput("");
  }

  function unlockHost() {
    const stored = ls.getStr(LS.hostPin, "");
    if (!stored) return;
    if (pinInput.trim() === stored) {
      setIsHostUnlocked(true);
      setPinInput("");
    }
  }

  function lockHost() {
    setIsHostUnlocked(false);
    setPinInput("");
  }

  function hostSetNames(next: Names) {
    if (!isHostUnlocked) return;
    setNames(next);
  }

  function hostStartTimer() {
    if (!isHostUnlocked) return;
    setEndAt(nowMs() + durationSec * 1000);
  }

  function hostRestartTimer() {
    if (!isHostUnlocked) return;
    setEndAt(nowMs() + durationSec * 1000);
  }

  function hostStopTimer() {
    if (!isHostUnlocked) return;
    setEndAt(null);
  }

  function hostResetVotesAll() {
    if (!isHostUnlocked) return;
    setVotes(DEFAULT_VOTES);
    ls.remove(LS.lastVoteAt);
  }

  function hostSetDuration(sec: number) {
    if (!isHostUnlocked) return;
    setDurationSec(clamp(sec, 30, 60 * 60)); // 30s to 60m
  }

  // styles
  const S = {
    page: {
      minHeight: "100vh",
      color: "rgba(255,255,255,0.92)",
      background:
        "radial-gradient(1200px 700px at 20% 0%, rgba(120,60,180,0.18), transparent 60%), radial-gradient(900px 600px at 80% 20%, rgba(60,140,220,0.12), transparent 55%), #07080b",
      padding: "24px 16px 40px",
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji","Segoe UI Emoji"',
    } as React.CSSProperties,
    container: {
      maxWidth: 760,
      margin: "0 auto",
    } as React.CSSProperties,
    h1: {
      fontSize: 44,
      lineHeight: 1.0,
      letterSpacing: 1,
      margin: 0,
      fontWeight: 900,
    } as React.CSSProperties,
    sub: { marginTop: 10, opacity: 0.8 } as React.CSSProperties,
    card: {
      marginTop: 18,
      padding: 18,
      borderRadius: 20,
      border: "1px solid rgba(255,255,255,0.08)",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
      boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
    } as React.CSSProperties,
    row: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
      alignItems: "center",
    } as React.CSSProperties,
    label: { fontSize: 13, opacity: 0.7, marginBottom: 6 } as React.CSSProperties,
    input: {
      width: "100%",
      padding: "14px 14px",
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(0,0,0,0.30)",
      color: "rgba(255,255,255,0.92)",
      outline: "none",
      fontSize: 16,
    } as React.CSSProperties,
    btn: {
      padding: "12px 14px",
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.06)",
      color: "rgba(255,255,255,0.92)",
      fontWeight: 800,
      cursor: "pointer",
      userSelect: "none",
    } as React.CSSProperties,
    btnPrimary: {
      background: "rgba(255,255,255,0.10)",
      border: "1px solid rgba(255,255,255,0.16)",
    } as React.CSSProperties,
    btnDisabled: {
      opacity: 0.45,
      cursor: "not-allowed",
    } as React.CSSProperties,
    timerBox: {
      marginTop: 14,
      padding: "14px 16px",
      borderRadius: 20,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.04)",
      display: "inline-flex",
      alignItems: "center",
      gap: 14,
    } as React.CSSProperties,
    timerBig: { fontSize: 44, fontWeight: 900, letterSpacing: 1 } as React.CSSProperties,
    scoreRow: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
      marginTop: 16,
      alignItems: "end",
    } as React.CSSProperties,
    scoreBox: { padding: "8px 2px" } as React.CSSProperties,
    scoreName: { fontSize: 18, opacity: 0.9 } as React.CSSProperties,
    scoreNum: { fontSize: 52, fontWeight: 900, lineHeight: 1 } as React.CSSProperties,
    barWrap: {
      marginTop: 10,
      height: 14,
      borderRadius: 999,
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(255,255,255,0.06)",
    } as React.CSSProperties,
    barFill: (pct: number) =>
      ({
        height: "100%",
        width: `${pct}%`,
        background: "rgba(255,255,255,0.70)",
      } as React.CSSProperties),
    pctRow: {
      marginTop: 8,
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      fontSize: 14,
      opacity: 0.8,
    } as React.CSSProperties,
    voteRow: {
      marginTop: 14,
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
    } as React.CSSProperties,
    voteBtn: {
      padding: "14px 14px", // smaller so they never overlap
      borderRadius: 18,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(255,255,255,0.07)",
      fontSize: 18,
      fontWeight: 900,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    } as React.CSSProperties,
    hint: { marginTop: 8, opacity: 0.7 } as React.CSSProperties,
    note: { marginTop: 18, opacity: 0.6, lineHeight: 1.4 } as React.CSSProperties,
    hostTag: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 12px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(255,255,255,0.05)",
      fontWeight: 800,
      cursor: "pointer",
      userSelect: "none",
    } as React.CSSProperties,
    hostPanel: {
      marginTop: 14,
      padding: 14,
      borderRadius: 18,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(0,0,0,0.20)",
    } as React.CSSProperties,
    small: { fontSize: 13, opacity: 0.72, lineHeight: 1.35 } as React.CSSProperties,
  };

  const [showHost, setShowHost] = useState(true);

  return (
    <main style={S.page}>
      <div style={S.container}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
          <div>
            <h1 style={S.h1}>GHOSTHAVN<br />LIVEVOTE</h1>
            <div style={S.sub}>Live 1v1 rap battle voting<br />Powered by Ghosthavn</div>
          </div>

          <div style={S.timerBox}>
            <div style={{ opacity: 0.75, fontWeight: 900, letterSpacing: 1 }}>TIME LEFT</div>
            <div style={S.timerBig}>{formatMMSS(timeLeftSec)}</div>
          </div>
        </div>

        {/* HOST PANEL (always visible, but locked) */}
        <div style={S.card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div
              style={S.hostTag}
              onClick={() => setShowHost((v) => !v)}
              title="Tap to expand/collapse"
            >
              Host controls {isHostUnlocked ? "— UNLOCKED" : "— LOCKED"}
            </div>

            {isHostUnlocked ? (
              <button style={{ ...S.btn, ...S.btnPrimary }} onClick={lockHost}>
                Lock
              </button>
            ) : null}
          </div>

          {showHost && (
            <div style={S.hostPanel}>
              {!hostPinExists ? (
                <>
                  <div style={S.small}>
                    First time on this device: create a Host PIN (4+ digits). Only this phone will be able to control names/timer/reset.
                  </div>
                  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
                    <input
                      style={S.input}
                      inputMode="numeric"
                      placeholder="Create host PIN (4+ digits)"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                    />
                    <button
                      style={{ ...S.btn, ...S.btnPrimary, ...(pinInput.trim().length < 4 ? S.btnDisabled : {}) }}
                      onClick={createHostPin}
                      disabled={pinInput.trim().length < 4}
                    >
                      Create
                    </button>
                  </div>
                </>
              ) : !isHostUnlocked ? (
                <>
                  <div style={S.small}>
                    Enter the Host PIN to unlock editing + timer controls on this device.
                  </div>
                  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
                    <input
                      style={S.input}
                      inputMode="numeric"
                      placeholder="Enter host PIN"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                    />
                    <button
                      style={{ ...S.btn, ...S.btnPrimary }}
                      onClick={unlockHost}
                    >
                      Unlock
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ ...S.row, marginTop: 4 }}>
                    <div>
                      <div style={S.label}>Battle duration (seconds)</div>
                      <input
                        style={S.input}
                        inputMode="numeric"
                        value={String(durationSec)}
                        onChange={(e) => hostSetDuration(Number(e.target.value || 0))}
                      />
                    </div>
                    <div style={{ display: "grid", gap: 10, alignSelf: "end" }}>
                      <button style={{ ...S.btn, ...S.btnPrimary }} onClick={hostStartTimer}>
                        Start Battle Timer
                      </button>
                      <button style={S.btn} onClick={hostStopTimer}>
                        Stop / Clear Timer
                      </button>
                    </div>
                  </div>

                  <div style={{ ...S.row, marginTop: 14 }}>
                    <div>
                      <div style={S.label}>Rapper A name</div>
                      <input
                        style={S.input}
                        value={names.a}
                        onChange={(e) => hostSetNames({ ...names, a: e.target.value })}
                      />
                    </div>
                    <div>
                      <div style={S.label}>Rapper B name</div>
                      <input
                        style={S.input}
                        value={names.b}
                        onChange={(e) => hostSetNames({ ...names, b: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <button style={S.btn} onClick={hostRestartTimer}>
                      Restart Timer
                    </button>
                    <button style={{ ...S.btn, ...S.btnPrimary }} onClick={hostResetVotesAll}>
                      Reset Votes (This Device)
                    </button>
                  </div>

                  <div style={{ ...S.small, marginTop: 10 }}>
                    Viewers can vote but can’t edit names or reset/timer unless host is unlocked on this device.
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* VIEWER SECTION */}
        <div style={S.card}>
          <div style={S.row}>
            <div>
              <div style={S.label}>Rapper A name</div>
              <input style={S.input} value={names.a} disabled />
            </div>
            <div>
              <div style={S.label}>Rapper B name</div>
              <input style={S.input} value={names.b} disabled />
            </div>
          </div>

          <div style={S.scoreRow}>
            <div style={S.scoreBox}>
              <div style={S.scoreName}>{names.a}</div>
              <div style={S.scoreNum}>{votes.a}</div>
            </div>
            <div style={{ ...S.scoreBox, textAlign: "right" }}>
              <div style={S.scoreName}>{names.b}</div>
              <div style={S.scoreNum}>{votes.b}</div>
            </div>
          </div>

          <div style={S.barWrap}>
            <div style={S.barFill(pctA)} />
          </div>

          <div style={S.pctRow}>
            <div>{pctA}%</div>
            <div style={{ textAlign: "right" }}>{pctB}%</div>
          </div>

          <div style={S.voteRow}>
            <button
              style={{ ...S.voteBtn, ...(canVote() ? {} : S.btnDisabled) }}
              onClick={() => voteFor("a")}
              disabled={!canVote()}
            >
              📦 Vote {names.a}
            </button>
            <button
              style={{ ...S.voteBtn, ...(canVote() ? {} : S.btnDisabled) }}
              onClick={() => voteFor("b")}
              disabled={!canVote()}
            >
              📦 Vote {names.b}
            </button>
          </div>

          <div style={S.hint}>
            {endAt && nowMs() >= endAt ? (
              <>Battle ended. Host can restart timer.</>
            ) : cooldownLeft > 0 ? (
              <>Hold up… cooldown active. Try again in {cooldownLeft}s.</>
            ) : (
              <>Tap a button to vote. One vote every {VOTE_COOLDOWN_SEC}s per device.</>
            )}
          </div>

          <div style={S.note}>
            Note: This version stores votes on the viewer’s device (localStorage). If you want real global live voting across all phones,
            next we’ll add a free database (Supabase) so every vote updates live for everyone.
          </div>
        </div>
      </div>
    </main>
  );
                                    }
