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

type Names = { a: string; b: string };
type Votes = { a: number; b: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(n, max));
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function Page() {
  const [mounted, setMounted] = useState(false);

  // Core state (loaded from localStorage)
  const [names, setNames] = useState<Names>({ a: "Rapper A", b: "Rapper B" });
  const [votes, setVotes] = useState<Votes>({ a: 0, b: 0 });
  const [durationSec, setDurationSec] = useState<number>(600); // 10 min default
  const [timerEndAt, setTimerEndAt] = useState<number | null>(null);

  // Host auth
  const [hostPinExists, setHostPinExists] = useState<boolean>(false);
  const [hostUnlocked, setHostUnlocked] = useState<boolean>(false);
  const [createPin, setCreatePin] = useState("");
  const [unlockPin, setUnlockPin] = useState("");

  // UI
  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useState<string>("");

  const cooldownSec = 10;

  // Load from localStorage once
  useEffect(() => {
    setMounted(true);

    const storedNames = safeJsonParse<Names>(localStorage.getItem(LS.names), {
      a: "Rapper A",
      b: "Rapper B",
    });
    const storedVotes = safeJsonParse<Votes>(localStorage.getItem(LS.votes), { a: 0, b: 0 });

    const storedDuration = Number(localStorage.getItem(LS.durationSec) || 600);
    const storedEndAt = Number(localStorage.getItem(LS.timerEndAt) || 0);

    const pin = localStorage.getItem(LS.hostPin);
    setHostPinExists(!!pin);

    setNames(storedNames);
    setVotes(storedVotes);
    setDurationSec(Number.isFinite(storedDuration) ? clamp(storedDuration, 30, 3600) : 600);
    setTimerEndAt(storedEndAt > 0 ? storedEndAt : null);
  }, []);

  // Tick clock for countdown
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  // Persist changes
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(LS.names, JSON.stringify(names));
  }, [mounted, names]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(LS.votes, JSON.stringify(votes));
  }, [mounted, votes]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(LS.durationSec, String(durationSec));
  }, [mounted, durationSec]);

  useEffect(() => {
    if (!mounted) return;
    if (timerEndAt) localStorage.setItem(LS.timerEndAt, String(timerEndAt));
    else localStorage.removeItem(LS.timerEndAt);
  }, [mounted, timerEndAt]);

  // Auto clear toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const battleRunning = useMemo(() => {
    if (!timerEndAt) return false;
    return timerEndAt > now;
  }, [timerEndAt, now]);

  const timeLeftSec = useMemo(() => {
    if (!timerEndAt) return durationSec;
    return Math.max(0, Math.ceil((timerEndAt - now) / 1000));
  }, [timerEndAt, now, durationSec]);

  const totalVotes = votes.a + votes.b;
  const pctA = totalVotes === 0 ? 50 : Math.round((votes.a / totalVotes) * 100);
  const pctB = 100 - pctA;

  function setHostPinAction() {
    const pin = createPin.trim();
    if (pin.length < 4) {
      setToast("PIN must be at least 4 characters.");
      return;
    }
    localStorage.setItem(LS.hostPin, pin);
    setHostPinExists(true);
    setHostUnlocked(true);
    setCreatePin("");
    setToast("Host PIN set. Host unlocked.");
  }

  function unlockHost() {
    const saved = localStorage.getItem(LS.hostPin);
    if (!saved) {
      setToast("No host PIN set yet.");
      return;
    }
    if (unlockPin.trim() === saved) {
      setHostUnlocked(true);
      setUnlockPin("");
      setToast("Host unlocked.");
    } else {
      setToast("Wrong PIN.");
    }
  }

  function hostLock() {
    setHostUnlocked(false);
    setToast("Host locked.");
  }

  function hostResetPin() {
    // Reset host pin for this device (host only)
    localStorage.removeItem(LS.hostPin);
    setHostPinExists(false);
    setHostUnlocked(false);
    setUnlockPin("");
    setCreatePin("");
    setToast("Host PIN cleared (this device). Set a new one.");
  }

  function hostResetVotes() {
    setVotes({ a: 0, b: 0 });
    localStorage.removeItem(LS.lastVoteAt);
    setToast("Votes reset (this device).");
  }

  function hostStartBattle() {
    // Reset votes + start fresh timer
    setVotes({ a: 0, b: 0 });
    localStorage.removeItem(LS.lastVoteAt);
    setTimerEndAt(Date.now() + durationSec * 1000);
    setToast("Battle started.");
  }

  function hostRestartTimer() {
    setTimerEndAt(Date.now() + durationSec * 1000);
    setToast("Timer restarted.");
  }

  function hostStopTimer() {
    setTimerEndAt(null);
    setToast("Timer stopped.");
  }

  function canVoteNow(): { ok: boolean; msg?: string } {
    if (!battleRunning) return { ok: false, msg: "Battle hasn't started yet." };

    const last = Number(localStorage.getItem(LS.lastVoteAt) || 0);
    const diffSec = (Date.now() - last) / 1000;
    if (last > 0 && diffSec < cooldownSec) {
      return { ok: false, msg: `Cooldown active. Try again in ${Math.ceil(cooldownSec - diffSec)}s.` };
    }
    return { ok: true };
  }

  function voteA() {
    const chk = canVoteNow();
    if (!chk.ok) {
      setToast(chk.msg || "Can't vote yet.");
      return;
    }
    setVotes((v) => ({ ...v, a: v.a + 1 }));
    localStorage.setItem(LS.lastVoteAt, String(Date.now()));
  }

  function voteB() {
    const chk = canVoteNow();
    if (!chk.ok) {
      setToast(chk.msg || "Can't vote yet.");
      return;
    }
    setVotes((v) => ({ ...v, b: v.b + 1 }));
    localStorage.setItem(LS.lastVoteAt, String(Date.now()));
  }

  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: "100vh",
      padding: "24px 16px 40px",
      color: "#fff",
      background: "radial-gradient(1200px 800px at 20% 0%, rgba(160,120,255,.18), transparent 60%), radial-gradient(900px 700px at 90% 20%, rgba(0,180,255,.12), transparent 55%), #0b0b0f",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
    },
    container: { maxWidth: 820, margin: "0 auto" },
    headerRow: { display: "flex", gap: 16, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" },
    title: { fontSize: 44, letterSpacing: 1, margin: 0, fontWeight: 800, lineHeight: 1.05 },
    subtitle: { marginTop: 10, opacity: 0.78, fontSize: 18, lineHeight: 1.35 },
    card: {
      marginTop: 18,
      background: "rgba(255,255,255,.06)",
      border: "1px solid rgba(255,255,255,.10)",
      borderRadius: 18,
      padding: 16,
      boxShadow: "0 10px 30px rgba(0,0,0,.35)",
      backdropFilter: "blur(10px)",
    },
    timerBox: {
      minWidth: 210,
      textAlign: "center",
      padding: "14px 16px",
      borderRadius: 18,
      border: "1px solid rgba(255,255,255,.12)",
      background: "rgba(255,255,255,.06)",
    },
    timerLabel: { opacity: 0.8, fontSize: 12, letterSpacing: 1.2, fontWeight: 700 },
    timerValue: { fontSize: 42, fontWeight: 900, marginTop: 6 },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
    label: { fontSize: 13, opacity: 0.85, marginBottom: 6 },
    input: {
      width: "100%",
      padding: "12px 12px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,.12)",
      background: "rgba(0,0,0,.35)",
      color: "#fff",
      outline: "none",
      fontSize: 16,
    },
    helper: { marginTop: 10, opacity: 0.7, fontSize: 14 },
    row: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" },
    btn: {
      padding: "12px 14px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,.14)",
      background: "rgba(255,255,255,.07)",
      color: "#fff",
      fontWeight: 800,
      cursor: "pointer",
    },
    btnPrimary: {
      padding: "12px 14px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,.18)",
      background: "rgba(255,255,255,.12)",
      color: "#fff",
      fontWeight: 900,
      cursor: "pointer",
    },
    btnDanger: {
      padding: "12px 14px",
      borderRadius: 14,
      border: "1px solid rgba(255,110,110,.35)",
      background: "rgba(255,110,110,.12)",
      color: "#fff",
      fontWeight: 900,
      cursor: "pointer",
    },
    scoreboardRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 18 },
    scoreSide: { width: "48%" },
    nameBig: { fontSize: 18, opacity: 0.92, fontWeight: 800 },
    scoreBig: { fontSize: 52, fontWeight: 950, lineHeight: 1, marginTop: 6 },
    barOuter: {
      height: 14,
      borderRadius: 999,
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,.10)",
      background: "rgba(255,255,255,.06)",
      marginTop: 14,
    },
    barInner: { height: "100%", width: `${pctA}%`, background: "rgba(255,255,255,.65)" },
    pctRow: { display: "flex", justifyContent: "space-between", opacity: 0.8, marginTop: 10, fontSize: 16 },
    voteRow: { display: "flex", justifyContent: "space-between", gap: 12, marginTop: 16 },
    voteBtn: {
      width: "48%",
      padding: "14px 12px",
      borderRadius: 18,
      border: "1px solid rgba(255,255,255,.14)",
      background: "rgba(255,255,255,.08)",
      color: "#fff",
      fontWeight: 900,
      fontSize: 18,
      cursor: "pointer",
    },
    note: { marginTop: 12, opacity: 0.65, fontSize: 14, lineHeight: 1.35 },
    toast: {
      position: "fixed",
      left: "50%",
      bottom: 20,
      transform: "translateX(-50%)",
      background: "rgba(0,0,0,.78)",
      border: "1px solid rgba(255,255,255,.12)",
      padding: "10px 14px",
      borderRadius: 14,
      color: "#fff",
      fontWeight: 800,
      zIndex: 9999,
      maxWidth: "92vw",
      textAlign: "center",
    },
  };

  // Mobile stacking
  const isSmall = typeof window !== "undefined" ? window.innerWidth < 560 : false;

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>GHOSTHAVN<br />LIVEVOTE</h1>
            <div style={styles.subtitle}>
              Live 1v1 rap battle voting<br />
              <span style={{ opacity: 0.78 }}>Powered by Ghosthavn</span>
            </div>
          </div>

          <div style={styles.timerBox}>
            <div style={styles.timerLabel}>{battleRunning ? "TIME LEFT" : "READY"}</div>
            <div style={styles.timerValue}>{formatTime(timeLeftSec)}</div>
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
              {battleRunning ? "Voting is live" : "Host starts battle"}
            </div>
          </div>
        </div>

        {/* HOST SECTION */}
        <section style={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.3 }}>Host controls</div>
            <div style={{ fontSize: 13, opacity: 0.75 }}>
              {hostUnlocked ? "Unlocked ✅" : "Locked 🔒"}
            </div>
          </div>

          {/* First-time host setup */}
          {!hostPinExists && (
            <>
              <div style={{ marginTop: 12 }}>
                <div style={styles.label}>Create host PIN (this device becomes the host)</div>
                <div style={styles.row}>
                  <input
                    style={{ ...styles.input, maxWidth: 260 }}
                    type="password"
                    inputMode="numeric"
                    placeholder="4+ digits"
                    value={createPin}
                    onChange={(e) => setCreatePin(e.target.value)}
                  />
                  <button style={styles.btnPrimary} onClick={setHostPinAction}>
                    Set Host PIN
                  </button>
                </div>
                <div style={styles.helper}>
                  Tip: Use your phone as the host device. Viewers can’t change names or admin controls.
                </div>
              </div>
            </>
          )}

          {/* Existing host pin: unlock */}
          {hostPinExists && !hostUnlocked && (
            <div style={{ marginTop: 12 }}>
              <div style={styles.label}>Enter host PIN to unlock</div>
              <div style={styles.row}>
                <input
                  style={{ ...styles.input, maxWidth: 260 }}
                  type="password"
                  inputMode="numeric"
                  placeholder="Host PIN"
                  value={unlockPin}
                  onChange={(e) => setUnlockPin(e.target.value)}
                />
                <button style={styles.btnPrimary} onClick={unlockHost}>
                  Unlock
                </button>
              </div>
              <div style={styles.helper}>
                Names + timer + admin buttons stay locked for everyone until host unlocks (on this device).
              </div>
            </div>
          )}

          {/* Host unlocked controls */}
          {hostUnlocked && (
            <div style={{ marginTop: 14 }}>
              <div style={styles.grid2}>
                <div>
                  <div style={styles.label}>Rapper A name</div>
                  <input
                    style={styles.input}
                    value={names.a}
                    onChange={(e) => setNames((n) => ({ ...n, a: e.target.value }))}
                    placeholder="Rapper A"
                  />
                </div>
                <div>
                  <div style={styles.label}>Rapper B name</div>
                  <input
                    style={styles.input}
                    value={names.b}
                    onChange={(e) => setNames((n) => ({ ...n, b: e.target.value }))}
                    placeholder="Rapper B"
                  />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={styles.label}>Battle duration (seconds)</div>
                <div style={styles.row}>
                  <input
                    style={{ ...styles.input, maxWidth: 220 }}
                    type="number"
                    min={30}
                    max={3600}
                    value={durationSec}
                    onChange={(e) => setDurationSec(clamp(Number(e.target.value || 0), 30, 3600))}
                  />
                  <span style={{ opacity: 0.7, fontSize: 14 }}>
                    (30–3600 sec)
                  </span>
                </div>
              </div>

              <div style={{ marginTop: 14, ...styles.row }}>
                <button style={styles.btnPrimary} onClick={hostStartBattle}>
                  Start Battle (Reset votes)
                </button>
                <button style={styles.btn} onClick={hostRestartTimer}>
                  Restart Timer
                </button>
                <button style={styles.btn} onClick={hostStopTimer}>
                  Stop Timer
                </button>
                <button style={styles.btnDanger} onClick={hostResetVotes}>
                  Reset Votes (This device)
                </button>
                <button style={styles.btn} onClick={hostLock}>
                  Lock Host
                </button>
                <button style={styles.btnDanger} onClick={hostResetPin}>
                  Clear Host PIN
                </button>
              </div>

              <div style={styles.note}>
                Host controls are stored on this device. If you want “one host controls everyone’s phones” later,
                we’ll add Supabase (global sync).
              </div>
            </div>
          )}
        </section>

        {/* VIEWER NAME DISPLAY (locked if host not unlocked) */}
        {!hostUnlocked && (
          <section style={styles.card}>
            <div style={styles.grid2}>
              <div>
                <div style={styles.label}>Rapper A name</div>
                <input style={styles.input} value={names.a} readOnly />
              </div>
              <div>
                <div style={styles.label}>Rapper B name</div>
                <input style={styles.input} value={names.b} readOnly />
              </div>
            </div>
            <div style={styles.helper}>
              Names are locked. Only the host PIN can edit them.
            </div>
          </section>
        )}

        {/* SCOREBOARD */}
        <section style={styles.card}>
          <div style={styles.scoreboardRow}>
            <div style={styles.scoreSide}>
              <div style={styles.nameBig}>{names.a}</div>
              <div style={styles.scoreBig}>{votes.a}</div>
            </div>
            <div style={{ ...styles.scoreSide, textAlign: "right" as const }}>
              <div style={styles.nameBig}>{names.b}</div>
              <div style={styles.scoreBig}>{votes.b}</div>
            </div>
          </div>

          <div style={styles.barOuter}>
            <div style={styles.barInner} />
          </div>

          <div style={styles.pctRow}>
            <div>{pctA}%</div>
            <div>{pctB}%</div>
          </div>

          <div style={styles.voteRow}>
            <button
              style={{
                ...styles.voteBtn,
                opacity: battleRunning ? 1 : 0.55,
                cursor: battleRunning ? "pointer" : "not-allowed",
              }}
              onClick={voteA}
              disabled={!battleRunning}
            >
              📦 Vote {isSmall ? "" : names.a}
            </button>

            <button
              style={{
                ...styles.voteBtn,
                opacity: battleRunning ? 1 : 0.55,
                cursor: battleRunning ? "pointer" : "not-allowed",
              }}
              onClick={voteB}
              disabled={!battleRunning}
            >
              📦 Vote {isSmall ? "" : names.b}
            </button>
          </div>

          <div style={{ marginTop: 10, opacity: 0.8, fontSize: 14 }}>
            Tap a button to vote. One vote every {cooldownSec}s per device.{" "}
            {!battleRunning && <strong>(Host must start the battle)</strong>}
          </div>

          <div style={styles.note}>
            Note: This version stores votes on the viewer’s device (localStorage). For real global live voting across all
            phones, next we’ll add a free database (Supabase) so every vote updates live for everyone.
          </div>
        </section>
      </div>

      {!!toast && <div style={styles.toast}>{toast}</div>}
    </main>
  );
      }
