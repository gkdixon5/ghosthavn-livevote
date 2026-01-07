"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- YOUR DIRECT SUPABASE CONNECTION ---
const SB_URL = "https://wdmfllqafitmeqbtzlpe.supabase.co";
const SB_KEY = "sb_publishable_6D5Ct0PRaioMF_REPLACE_WITH_FULL_KEY"; 
const supabase = createClient(SB_URL, SB_KEY);

export default function BattleRoom({ params }: { params: { room: string } }) {
  const [battle, setBattle] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isHost, setIsHost] = useState(false);
  const ROOM_ID = params.room;
  const ADMIN_PIN = "8888"; 

  useEffect(() => {
    const fetchAndSubscribe = async () => {
      const { data } = await supabase.from('battles').select('*').eq('room', ROOM_ID).single();
      if (data) setBattle(data);

      supabase.channel(`room-${ROOM_ID}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'battles', filter: `room=eq.${ROOM_ID}` }, 
        (payload) => setBattle(payload.new))
        .subscribe();
    };
    fetchAndSubscribe();
  }, [ROOM_ID]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (battle?.ends_at) {
        const remaining = Math.max(0, Math.floor((new Date(battle.ends_at).getTime() - Date.now()) / 1000));
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [battle]);

  const castVote = async (p: 'a' | 'b') => {
    if (timeLeft <= 0) return; 
    await supabase.rpc('increment_vote', { room_id: ROOM_ID, player_column: p });
  };

  if (!battle) return (
    <div className="bg-black text-white p-20 text-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">ARENA OFFLINE</h1>
      <p className="text-zinc-500 mb-10 italic">Enter PIN 8888 to start.</p>
      <input type="password" placeholder="Admin PIN" onChange={(e) => e.target.value === ADMIN_PIN && setIsHost(true)} className="bg-transparent text-center border-b border-zinc-800 outline-none w-full" />
      {isHost && (
        <button onClick={async () => {
          const end = new Date(Date.now() + 120000).toISOString();
          await supabase.from('battles').upsert({ room: ROOM_ID, votes_a:0, votes_b:0, ends_at:end, rapper_a:"Rapper A", rapper_b:"Rapper B" });
        }} className="mt-6 w-full bg-blue-600 py-4 rounded-2xl font-black uppercase">Start Global Battle</button>
      )}
    </div>
  );

  return (
    <main className="min-h-screen bg-black text-white p-6 flex flex-col items-center">
      <h1 className="text-4xl font-black text-red-600 uppercase italic mb-4">GLOBAL LIVE</h1>
      <div className="text-7xl font-mono bg-zinc-900 rounded-3xl py-4 px-6 border border-zinc-800 mb-10">
        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
      </div>
      <div className="w-full max-w-md space-y-6">
        {[ {id:'a', name:battle.rapper_a, v:battle.votes_a}, {id:'b', name:battle.rapper_b, v:battle.votes_b} ].map((p) => (
          <div key={p.id} className="bg-zinc-900 border-2 border-zinc-800 rounded-[40px] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-black uppercase italic">{p.name}</h2>
              <span className="text-5xl font-black text-yellow-500 tabular-nums">{p.v}</span>
            </div>
            <button 
              onClick={() => castVote(p.id as 'a'|'b')} 
              disabled={timeLeft <= 0}
              className={`w-full py-6 rounded-3xl font-black text-2xl active:scale-95 transition-all
                ${timeLeft > 0 ? 'bg-red-600 shadow-lg' : 'bg-zinc-800 text-zinc-600'}`}
            >
              {timeLeft > 0 ? "VOTE" : "LOCKED"}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
