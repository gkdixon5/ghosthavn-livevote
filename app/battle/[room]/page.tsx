"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../client'; // Ensure this points to your supabase client file

export default function BattleRoom({ params }: { params: { room: string } }) {
  const [battle, setBattle] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isHost, setIsHost] = useState(false);
  const [hostPin, setHostPin] = useState("");
  
  const ROOM_ID = params.room;
  const ADMIN_PIN = "8888"; // Set your secret PIN here

  // 1. CONNECT TO THE GLOBAL DATA
  useEffect(() => {
    // Get the current state of the room immediately
    const fetchBattle = async () => {
      const { data } = await supabase.from('battles').select('*').eq('room', ROOM_ID).single();
      if (data) setBattle(data);
    };
    fetchBattle();

    // LISTEN LIVE: If anything changes in the DB, update EVERYONE'S screen
    const channel = supabase.channel(`live-${ROOM_ID}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'battles', filter: `room=eq.${ROOM_ID}` }, 
      (payload) => setBattle(payload.new))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [ROOM_ID]);

  // 2. THE MASTER CLOCK (Synced to the DB 'ends_at' timestamp)
  useEffect(() => {
    const timer = setInterval(() => {
      if (battle?.ends_at) {
        const remaining = Math.max(0, Math.floor((new Date(battle.ends_at).getTime() - Date.now()) / 1000));
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [battle]);

  // 3. CAST A VOTE (Shared with everyone)
  const castVote = async (player: 'a' | 'b') => {
    if (timeLeft <= 0) return; // Voting is locked if timer is 0
    // Use the RPC function to prevent votes from overwriting each other
    await supabase.rpc('increment_vote', { room_id: ROOM_ID, player_column: player });
  };

  // 4. ADMIN: START THE ROUND
  const startRound = async () => {
    const duration = 120; // 2 minutes
    const end = new Date(Date.now() + duration * 1000).toISOString();
    
    await supabase.from('battles').update({
      votes_a: 0,
      votes_b: 0,
      ends_at: end,
      starts_at: new Date().toISOString()
    }).eq('room', ROOM_ID);
  };

  if (!battle) return <div className="p-20 text-white text-center">Loading Room {ROOM_ID}...</div>;

  return (
    <main className="min-h-screen bg-black text-white p-4 font-sans max-w-md mx-auto">
      {/* GLOBAL TALLY HEADER */}
      <div className="text-center py-10">
        <h1 className="text-5xl font-black italic text-red-600 uppercase tracking-tighter">LIVE VOTE</h1>
        <div className="text-7xl font-mono font-bold mt-4 bg-zinc-900 rounded-2xl py-2">
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
        {timeLeft === 0 && <p className="text-red-500 font-bold mt-2">VOTING LOCKED</p>}
      </div>

      {/* THE BATTLE CARDS */}
      <div className="space-y-6">
        {[ { id: 'a', name: battle.rapper_a, v: battle.votes_a }, 
           { id: 'b', name: battle.rapper_b, v: battle.votes_b } ].map((p) => (
          <div key={p.id} className="bg-zinc-900 border-2 border-zinc-800 rounded-3xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-black uppercase italic">{p.name}</h2>
              <span className="text-5xl font-bold text-yellow-500">{p.v}</span>
            </div>
            <button 
              onClick={() => castVote(p.id as 'a' | 'b')}
              disabled={timeLeft <= 0}
              className={`w-full py-5 rounded-2xl font-black text-2xl active:scale-95 transition-all
                ${timeLeft > 0 ? 'bg-red-600 shadow-lg' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
            >
              VOTE {p.id.toUpperCase()}
            </button>
          </div>
        ))}
      </div>

      {/* HIDDEN ADMIN CONTROLS */}
      <div className="mt-20 border-t border-zinc-800 pt-10 pb-20">
        {!isHost ? (
          <input 
            type="password" placeholder="Admin Access" 
            className="w-full bg-transparent text-center text-zinc-700 outline-none"
            onChange={(e) => e.target.value === ADMIN_PIN && setIsHost(true)}
          />
        ) : (
          <div className="space-y-4">
            <button onClick={startRound} className="w-full bg-blue-600 py-4 rounded-xl font-bold uppercase">
               Start 2-Minute Round
            </button>
            <p className="text-center text-blue-400 text-xs font-bold">HOSTING ROOM: {ROOM_ID}</p>
          </div>
        )}
      </div>
    </main>
  );
}
