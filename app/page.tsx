"use client";

import { useState, useEffect, useRef } from "react";

export default function BattlePage() {
  // --- STATE ---
  const [isHost, setIsHost] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  
  // Battle Config
  const [name1, setName1] = useState("Player 1");
  const [name2, setName2] = useState("Player 2");
  const [votes, setVotes] = useState({ p1: 0, p2: 0 });
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const HOST_PIN = "1234"; // Hardcoded for this demo

  // --- HYDRATION & PERSISTENCE ---
  useEffect(() => {
    setIsMounted(true);
    const savedVotes = localStorage.getItem("battle_votes");
    if (savedVotes) setVotes(JSON.parse(savedVotes));
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("battle_votes", JSON.stringify(votes));
    }
  }, [votes, isMounted]);

  // --- TIMER LOGIC ---
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, timeLeft]);

  // --- ACTIONS ---
  const handlePinSubmit = () => {
    if (pinInput === HOST_PIN) setIsHost(true);
    else alert("Incorrect PIN");
  };

  const startBattle = () => {
    setTimeLeft(60); // 60 second battle
    setIsActive(true);
    setVotes({ p1: 0, p2: 0 }); // Reset for new battle
  };

  const castVote = (player: "p1" | "p2") => {
    if (!isActive) return; // Prevent voting if timer isn't running
    setVotes((prev) => ({ ...prev, [player]: prev[player] + 1 }));
  };

  if (!isMounted) return null; // Prevent hydration flash

  return (
    <main className="min-h-screen bg-slate-900 text-white p-4 flex flex-col items-center font-sans">
      
      {/* HOST PIN SECTION */}
      {!isHost && (
        <div className="w-full max-w-xs mb-8 p-4 bg-slate-800 rounded-xl border border-slate-700">
          <p className="text-xs text-slate-400 mb-2">Host Access</p>
          <div className="flex gap-2">
            <input 
              type="password" 
              placeholder="Enter PIN" 
              className="bg-slate-900 border border-slate-600 rounded p-2 w-full text-center focus:outline-none focus:border-blue-500"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
            />
            <button onClick={handlePinSubmit} className="bg-blue-600 px-4 py-2 rounded font-bold">OK</button>
          </div>
        </div>
      )}

      {/* BATTLE NAMES & TIMER */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black italic tracking-tighter text-yellow-500 mb-2 uppercase">Battle Mode</h1>
        <div className="text-6xl font-mono font-bold tabular-nums">
          {timeLeft > 0 ? `00:${timeLeft.toString().padStart(2, '0')}` : "00:00"}
        </div>
        {!isActive && timeLeft === 0 && (
          <p className="text-red-400 font-bold uppercase animate-pulse mt-2 text-sm">Waiting for Host...</p>
        )}
      </div>

      {/* BATTLE CARDS */}
      <div className="flex flex-col w-full gap-4 max-w-md">
        {[ { id: "p1", name: name1, setName: setName1, v: votes.p1 }, 
           { id: "p2", name: name2, setName: setName2, v: votes.p2 } ].map((p) => (
          <div key={p.id} className={`p-6 rounded-2xl border-4 transition-all ${isActive ? 'border-yellow-500 bg-slate-800 shadow-lg' : 'border-slate-700 bg-slate-900 opacity-80'}`}>
            <div className="flex justify-between items-center mb-4">
              {isHost ? (
                <input 
                  value={p.name} 
                  onChange={(e) => p.setName(e.target.value)} 
                  className="bg-transparent border-b border-yellow-500 text-2xl font-bold w-1/2 outline-none"
                />
              ) : (
                <h2 className="text-2xl font-bold">{p.name}</h2>
              )}
              <span className="text-3xl font-black text-yellow-400">{p.v}</span>
            </div>
            
            <button 
              disabled={!isActive}
              onClick={() => castVote(p.id as "p1" | "p2")}
              className={`w-full py-4 rounded-xl text-xl font-bold uppercase tracking-widest transition-all
                ${isActive ? 'bg-yellow-500 text-black active:scale-95' : 'bg-slate-800 text-slate-600'}`}
            >
              Vote {p.id === "p1" ? "A" : "B"}
            </button>
          </div>
        ))}
      </div>

      {/* HOST CONTROLS */}
      {isHost && (
        <div className="mt-12 w-full max-w-md p-6 bg-blue-900/30 border border-blue-500/50 rounded-2xl">
          <h3 className="text-blue-400 font-bold uppercase text-xs mb-4">Host Panel</h3>
          <button 
            onClick={startBattle} 
            disabled={isActive}
            className="w-full bg-blue-600 py-3 rounded-lg font-black uppercase text-white shadow-xl disabled:bg-slate-700"
          >
            {isActive ? "Battle in Progress" : "🔥 Start Battle Timer 🔥"}
          </button>
        </div>
      )}
    </main>
  );
}
