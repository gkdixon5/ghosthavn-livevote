"use client";

import { useEffect, useState } from "react";

const HOST_PIN = "1337"; // change this later

export default function Home() {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");

  const [nameA, setNameA] = useState("Rapper A");
  const [nameB, setNameB] = useState("Rapper B");

  const [votesA, setVotesA] = useState(0);
  const [votesB, setVotesB] = useState(0);

  const [timeLeft, setTimeLeft] = useState(600);
  const [timerRunning, setTimerRunning] = useState(false);

  // timer tick
  useEffect(() => {
    if (!timerRunning) return;
    if (timeLeft <= 0) {
      setTimerRunning(false);
      return;
    }
    const t = setInterval(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [timerRunning, timeLeft]);

  const pctA =
    votesA + votesB === 0 ? 50 : Math.round((votesA / (votesA + votesB)) * 100);
  const pctB = 100 - pctA;

  return (
    <main style={{ padding: "1.2rem", maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ fontSize: "2.4rem", marginBottom: 6 }}>
        GHOSTHAVN LIVEVOTE
      </h1>
      <p style={{ opacity: 0.7, marginBottom: 20 }}>
        Live 1v1 rap battle voting
      </p>

      {/* TIMER */}
      <div style={card}>
        <div style={{ opacity: 0.7 }}>TIME LEFT</div>
        <div style={{ fontSize: "2.2rem", fontWeight: 700 }}>
          {Math.floor(timeLeft / 60)
            .toString()
            .padStart(2, "0")}
          :
          {(timeLeft % 60).toString().padStart(2, "0")}
        </div>

        {unlocked && (
          <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
            <button onClick={() => setTimerRunning(true)} style={btnSmall}>
              Start
            </button>
            <button
              onClick={() => {
                setTimeLeft(600);
                setTimerRunning(false);
              }}
              style={btnSmall}
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* HOST CONTROLS */}
      <div style={card}>
        <strong>Host controls</strong>
        <input
          placeholder="Enter host PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          style={input}
        />
        <button
          onClick={() => pin === HOST_PIN && setUnlocked(true)}
          style={btn}
        >
          Unlock
        </button>
        <p style={{ opacity: 0.6, fontSize: 13 }}>
          Names + admin buttons stay locked until host unlocks.
        </p>
      </div>

      {/* NAMES */}
      <div style={card}>
        <label>Rapper A name</label>
        <input
          value={nameA}
          disabled={!unlocked}
          onChange={(e) => setNameA(e.target.value)}
          style={input}
        />
        <label>Rapper B name</label>
        <input
          value={nameB}
          disabled={!unlocked}
          onChange={(e) => setNameB(e.target.value)}
          style={input}
        />
        {!unlocked && (
          <p style={{ opacity: 0.6, fontSize: 13 }}>
            Names are locked. Only the host PIN can edit them.
          </p>
        )}
      </div>

      {/* SCORE */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <strong>{nameA}</strong>
          <div style={score}>{votesA}</div>
        </div>
        <div>
          <strong>{nameB}</strong>
          <div style={score}>{votesB}</div>
        </div>
      </div>

      {/* BAR */}
      <div style={barWrap}>
        <div style={{ ...barA, width: `${pctA}%` }} />
        <div style={{ ...barB, width: `${pctB}%` }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{pctA}%</span>
        <span>{pctB}%</span>
      </div>

      {/* VOTE BUTTONS — SMALLER */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <button onClick={() => setVotesA(votesA + 1)} style={btnVote}>
          Vote {nameA}
        </button>
        <button onClick={() => setVotesB(votesB + 1)} style={btnVote}>
          Vote {nameB}
        </button>
      </div>
    </main>
  );
}

/* styles */
const card = {
  background: "rgba(255,255,255,0.06)",
  borderRadius: 16,
  padding: 14,
  marginBottom: 16,
};

const input = {
  width: "100%",
  padding: 10,
  marginTop: 6,
  marginBottom: 10,
  borderRadius: 10,
  border: "none",
};

const btn = {
  padding: 10,
  borderRadius: 12,
  background: "#222",
  color: "#fff",
  border: "none",
};

const btnSmall = {
  padding: "8px 14px",
  borderRadius: 10,
  background: "#222",
  color: "#fff",
  border: "none",
};

const btnVote = {
  padding: "14px 0",
  borderRadius: 14,
  background: "#1e1e1e",
  color: "#fff",
  fontWeight: 600,
  border: "none",
};

const score = { fontSize: "2.2rem", fontWeight: 700 };

const barWrap = {
  height: 10,
  background: "#333",
  borderRadius: 10,
  overflow: "hidden",
  margin: "10px 0",
};

const barA = { height: "100%", background: "#aaa" };
const barB = { height: "100%", background: "#555" };
