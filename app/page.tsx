"use client";

import { useEffect, useState } from "react";

export default function Page() {
  // HOST / LOCK
  const [hostPin, setHostPin] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  // BATTLE STATE
  const [rapperA, setRapperA] = useState("Rapper A");
  const [rapperB, setRapperB] = useState("Rapper B");
  const [votesA, setVotesA] = useState(0);
  const [votesB, setVotesB] = useState(0);

  // TIMER
  const [timeLeft, setTimeLeft] = useState(0);
  const [running, setRunning] = useState(false);

  // LOAD HOST PIN
  useEffect(() => {
    const savedPin = localStorage.getItem("ghosthavn_host_pin");
    if (savedPin) setHostPin(savedPin);
  }, []);

  // TIMER TICK
  useEffect(() => {
    if (!running || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(t);
  }, [running, timeLeft]);

  function createPin() {
    if (pinInput.length < 4) return alert("PIN must be 4+ digits");
    localStorage.setItem("ghosthavn_host_pin", pinInput);
    setHostPin(pinInput);
    setUnlocked(true);
    setPinInput("");
  }

  function unlock() {
    if (pinInput === hostPin) {
      setUnlocked(true);
      setPinInput("");
    } else alert("Wrong PIN");
  }

  function startBattle() {
    setVotesA(0);
    setVotesB(0);
    setTimeLeft(60 * 10); // 10 minutes
    setRunning(true);
  }

  const total = votesA + votesB || 1;
  const pctA = Math.round((votesA / total) * 100);
  const pctB = 100 - pctA;

  return (
    <main style={{ padding: 20, maxWidth: 520, margin: "0 auto", color: "#fff" }}>
      <h1>GHOSTHAVN LIVEVOTE</h1>
      <p>Live 1v1 rap battle voting</p>

      {/* TIMER */}
      <div style={{ margin: "20px 0", fontSize: 24 }}>
        ⏱ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
      </div>

      {/* HOST CONTROLS */}
      <div style={{ border: "1px solid #333", padding: 12, borderRadius: 12 }}>
        <h3>Host Controls</h3>

        {!hostPin && (
          <>
            <input
              placeholder="Create host PIN"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
            />
            <button onClick={createPin}>Create PIN</button>
          </>
        )}

        {hostPin && !unlocked && (
          <>
            <input
              placeholder="Enter host PIN"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
            />
            <button onClick={unlock}>Unlock</button>
          </>
        )}

        {unlocked && (
          <>
            <input value={rapperA} onChange={(e) => setRapperA(e.target.value)} />
            <input value={rapperB} onChange={(e) => setRapperB(e.target.value)} />
            <button onClick={startBattle}>Start Battle</button>
          </>
        )}
      </div>

      {/* SCORE */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
        <div>
          <h2>{rapperA}</h2>
          <div style={{ fontSize: 32 }}>{votesA}</div>
        </div>
        <div>
          <h2>{rapperB}</h2>
          <div style={{ fontSize: 32 }}>{votesB}</div>
        </div>
      </div>

      {/* BAR */}
      <div style={{ height: 10, background: "#333", borderRadius: 10, margin: "10px 0" }}>
        <div
          style={{
            width: `${pctA}%`,
            height: "100%",
            background: "#0af",
            borderRadius: 10,
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{pctA}%</span>
        <span>{pctB}%</span>
      </div>

      {/* VOTE BUTTONS */}
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button style={{ flex: 1 }} onClick={() => setVotesA(votesA + 1)}>
          Vote {rapperA}
        </button>
        <button style={{ flex: 1 }} onClick={() => setVotesB(votesB + 1)}>
          Vote {rapperB}
        </button>
      </div>
    </main>
  );
}
