"use client";

import { useState, useEffect } from 'react';
// We are importing the client directly from the library to avoid the "Module not found" error
import { createClient } from '@supabase/supabase-js';

// Credentials pulled directly from your Supabase screenshot
const SB_URL = "https://wdmfllqafitmeqbtzlpe.supabase.co";
const SB_KEY = "sb_publishable_6D5Ct0PRaioMF..."; // PASTE YOUR FULL KEY FROM SCREENSHOT HERE
const supabase = createClient(SB_URL, SB_KEY);

export default function BattleRoom({ params }: { params: { room: string } }) {
  const [battle, setBattle] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isHost, setIsHost] = useState(false);
  const ROOM_ID = params.room;

  useEffect(() => {
    const fetchAndSubscribe = async () => {
      // 1. Initial Fetch
      const { data } = await supabase.from('battles').select('*').eq('room', ROOM_ID).single();
      if (data) setBattle(data);

      // 2. Realtime Subscription (This makes it "Live")
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
      <p>Connecting to Global Arena: {ROOM_ID}...</p>
      <div className="mt-10 opacity-50">
        <input type="password" placeholder="Admin PIN" onChange={(e) => e.target.value === "8888" && setIsHost(true)} className="bg-transparent text-center border-b border-zinc-800 outline-none" />
        {isHost && (
          <button onClick={async () => {
            const end = new Date(Date.now() + 120000).toISOString();
            await supabase.from('battles').upsert({ room: ROOM_ID, votes_a:0, votes_b:0, ends_at:end, rapper_a:"Rapper A", rapper_b:"Rapper B" });
          }} className="block w-full bg-blue-600 py-3 mt-4 rounded-xl font-bold">START ARENA</button>
        )}
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-black text-white p-6 font-sans flex flex-col items-center">
      <h1 className="text-red-600 font-black text-4xl mb-4 italic uppercase tracking-tighter italic">Global Live</h1>
      <div className="text-7xl font-mono bg-zinc-900 p-4 rounded-3xl mb-10 border border-zinc-800">
        {Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}
      </div>

      <div className="w-full max-w-md space-y-4">
        {[ {id:'a', name:battle.rapper_a, v:battle.votes_a}, {id:'b', name:battle.rapper_b, v:battle.votes_b} ].map((p) => (
          <div key={p.id} className="bg-zinc-900 p-6 rounded-[35px] border border-zinc-800 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-black uppercase italic tracking-tight">{p.name}</h2>
              <span className="text-4xl font-black text-yellow-500">{p.v}</span>
            </div>
            <button 
              onClick={() => castVote(p.id as 'a'|'b')} 
              disabled={timeLeft <= 0} 
              className={`w-full py-5 rounded-2xl font-black text-xl transition-all active:scale-95 ${timeLeft > 0 ? 'bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'bg-zinc-800 text-zinc-600'}`}
            >
              {timeLeft > 0 ? "VOTE NOW" : "LOCKED"}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-20 border-t border-zinc-900 pt-10 w-full max-w-md opacity-20 hover:opacity-100 transition-opacity">
        <input type="password" placeholder="Admin PIN" onChange={(e) => e.target.value === "8888" && setIsHost(true)} className="bg-transparent w-full text-center outline-none" />
        {isHost && (
          <button onClick={async () => {
            const end = new Date(Date.now() + 120000).toISOString();
            await supabase.from('battles').update({ votes_a:0, votes_b:0, ends_at:end }).eq('room', ROOM_ID);
          }} className="w-full bg-blue-600 py-4 mt-4 rounded-xl font-bold uppercase">Reset & Start Round</button>
        )}
      </div>
    </main>
  );
}
