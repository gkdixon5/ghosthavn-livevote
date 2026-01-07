"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../client'; 

export default function BattleRoom({ params }: { params: { room: string } }) {
  const [battle, setBattle] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isHost, setIsHost] = useState(false);
  const ROOM_ID = params.room;
  const ADMIN_PIN = "8888"; 

  // 1. THE GLOBAL PIPE (No more local storage)
  useEffect(() => {
    const fetchAndSubscribe = async () => {
      // Get current stats from Supabase
      const { data } = await supabase.from('battles').select('*').eq('room', ROOM_ID).single();
      if (data) setBattle(data);

      // Listen for the Admin to click "Start" or for new votes
      supabase.channel(`live-${ROOM_ID}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'battles', filter: `room=eq.${ROOM_ID}` }, 
        (payload) => setBattle(payload.new))
        .subscribe();
    };

    fetchAndSubscribe();
  }, [ROOM_ID]);

  // 2. THE GLOBAL TIMER
  useEffect(() => {
    const timer = setInterval(() => {
      if (battle?.ends_at) {
        const remaining = Math.max(0, Math.floor((new Date(battle.ends_at).getTime() - Date.now()) / 1000));
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [battle]);

  // 3. THE GLOBAL VOTE
  const castVote = async (p: 'a' | 'b') => {
    if (timeLeft <= 0) return; 
    await supabase.rpc('increment_vote', { room_id: ROOM_ID, player_column: p });
  };

  if (!battle) return <div className="p-20 text-white text-center font-bold">CREATING GLOBAL ROOM: {ROOM_ID}...</div>;

  return (
    <main className="min-h-screen bg-black text-white p-6 font-sans max-w-md mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-black italic text-red-600 uppercase tracking-tighter">GLOBAL LIVE</h1>
        <div className="text-7xl font-mono font-bold mt-4 bg-zinc-900 rounded-3xl py-4 border border-zinc-800">
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      </div>

      <div className="space-y-6">
        {[ { id: 'a', name: battle.rapper_a, v: battle.votes_a }, 
           { id: 'b', name: battle.rapper_b, v: battle.votes_b } ].map((p) => (
          <div key={p.id} className="bg-zinc-900 border-2 border-zinc-800 rounded-[40px] p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-black uppercase italic tracking-tight">{p.name}</h2>
              <span className="text-5xl font-black text-yellow-500">{p.v}</span>
            </div>
            <button 
              onClick={() => castVote(p.id as 'a' | 'b')}
              disabled={timeLeft <= 0}
              className={`w-full py-6 rounded-3xl font-black text-2xl active:scale-95 transition-all
                ${timeLeft > 0 ? 'bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'bg-zinc-800 text-zinc-600'}`}
            >
              {timeLeft > 0 ? "VOTE NOW" : "LOCKED"}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-20 opacity-30 hover:opacity-100 transition-opacity pb-20">
        {!isHost ? (
          <input 
            type="password" placeholder="Admin PIN" 
            className="w-full bg-transparent text-center text-zinc-700 outline-none"
            onChange={(e) => e.target.value === ADMIN_PIN && setIsHost(true)}
          />
        ) : (
          <button onClick={async () => {
            const end = new Date(Date.now() + 120000).toISOString(); 
            await supabase.from('battles').update({ votes_a: 0, votes_b: 0, ends_at: end }).eq('room', ROOM_ID);
          }} className="w-full bg-blue-600 py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl">
             START 2-MINUTE BATTLE
          </button>
        )}
      </div>
    </main>
  );
}
