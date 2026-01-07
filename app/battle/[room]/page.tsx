"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Credentials from your Supabase screenshot
const SB_URL = "https://wdmfllqafitmeqbtzlpe.supabase.co";
const SB_KEY = "sb_publishable_6D5Ct0PRaioMF..."; // Use the full key from your screenshot
const supabase = createClient(SB_URL, SB_KEY);
const ROOM_ID = "main-stage"; 

export default function BattleRoom() {
  const [battle, setBattle] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isHost, setIsHost] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const sync = async () => {
      const { data } = await supabase.from('battles').select('*').eq('room', ROOM_ID).single();
      if (data) setBattle(data);

      supabase.channel('arena').on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'battles' }, 
        (p) => setBattle(p.new)
      ).subscribe();
    };
    sync();
  }, [mounted]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (battle?.ends_at) {
        const diff = Math.max(0, Math.floor((new Date(battle.ends_at).getTime() - Date.now()) / 1000));
        setTimeLeft(diff);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [battle]);

  const vote = async (col: 'a' | 'b') => {
    if (timeLeft > 0) await supabase.rpc('increment_vote', { room_id: ROOM_ID, player_column: col });
  };

  if (!mounted) return null;
  if (!battle) return (
    <div className="bg-black text-white p-20 text-center min-h-screen">
      <p className="mb-4">Connecting to Global Arena...</p>
      <p className="text-xs text-zinc-500">If this hangs, enter PIN 8888 below to start the room.</p>
      <div className="mt-10">
        <input type="password" placeholder="Admin PIN" onChange={(e) => e.target.value === "8888" && setIsHost(true)} className="bg-transparent text-center border-b border-zinc-800 outline-none" />
        {isHost && (
          <button onClick={async () => {
            const end = new Date(Date.now() + 120000).toISOString();
            await supabase.from('battles').upsert({ room: ROOM_ID, votes_a:0, votes_b:0, ends_at:end, rapper_a:"Rapper A", rapper_b:"Rapper B" });
          }} className="block w-full bg-blue-600 py-3 mt-4 rounded-xl font-bold">START GLOBAL SESSION</button>
        )}
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-black text-white p-6 font-sans flex flex-col items-center">
      <h1 className="text-red-600 font-black text-4xl mb-4 italic uppercase tracking-tighter">Global Live</h1>
      <div className="text-7xl font-mono bg-zinc-900 p-4 rounded-3xl mb-10 border border-zinc-800">
        {Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}
      </div>

      <div className="w-full max-w-md space-y-4">
        {[ {id:'a', name:battle.rapper_a, v:battle.votes_a}, {id:'b', name:battle.rapper_b, v:battle.votes_b} ].map((p) => (
          <div key={p.id} className="bg-zinc-900 p-6 rounded-[35px] border border-zinc-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-black uppercase italic tracking-tight">{p.name}</h2>
              <span className="text-4xl font-black text-yellow-500">{p.v}</span>
            </div>
            <button onClick={() => vote(p.id as 'a'|'b')} disabled={timeLeft <= 0} className={`w-full py-5 rounded-2xl font-black text-xl transition-all active:scale-95 ${timeLeft > 0 ? 'bg-red-600 shadow-lg' : 'bg-zinc-800 text-zinc-600'}`}>
              {timeLeft > 0 ? "CAST VOTE" : "LOCKED"}
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
