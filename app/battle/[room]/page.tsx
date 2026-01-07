'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from './client';

type BattleRow = {
  room_code: string;
  rapper_a: string;
  rapper_b: string;
  a_votes: number;
  b_votes: number;
  is_live: boolean;
  ends_at: string | null;
};

export default function BattleRoom({ params }: { params: { room: string } }) {
  const room = decodeURIComponent(params.room);

  const [battle, setBattle] = useState<BattleRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [cooldown, setCooldown] = useState(0);

  const total = (battle?.a_votes ?? 0) + (battle?.b_votes ?? 0);
  const aPct = total ? Math.round(((battle?.a_votes ?? 0) / total) * 100) : 50;
  const bPct = 100 - aPct;

  const endsInSec = useMemo(() => {
    if (!battle?.ends_at) return null;
    const ms = new Date(battle.ends_at).getTime() - Date.now();
    return Math.max(0, Math.floor(ms / 1000));
  }, [battle?.ends_at]);

  // simple local cooldown (1 vote per 10s per device)
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function ensureRoomExists() {
    // Try load battle
    const { data, error } = await supabase
      .from('battles')
      .select('room_code, rapper_a, rapper_b, a_votes, b_votes, is_live, ends_at')
      .eq('room_code', room)
      .maybeSingle();

    if (error) throw error;

    // If missing, create it
    if (!data) {
      const { data: inserted, error: insErr } = await supabase
        .from('battles')
        .insert({ room_code: room })
        .select('room_code, rapper_a, rapper_b, a_votes, b_votes, is_live, ends_at')
        .single();

      if (insErr) throw insErr;
      return inserted as BattleRow;
    }

    return data as BattleRow;
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const row = await ensureRoomExists();
        if (!alive) return;
        setBattle(row);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? 'Failed to load room');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  // REALTIME subscription: updates everyone instantly
  useEffect(() => {
    const channel = supabase
      .channel(`battle:${room}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'battles', filter: `room_code=eq.${room}` },
        (payload) => {
          const newRow = payload.new as BattleRow;
          if (newRow?.room_code) setBattle(newRow);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room]);

  async function vote(which: 'A' | 'B') {
    if (!battle) return;
    if (!battle.is_live) return; // host must start battle
    if (cooldown > 0) return;

    setCooldown(10);

    const patch =
      which === 'A'
        ? { a_votes: (battle.a_votes ?? 0) + 1 }
        : { b_votes: (battle.b_votes ?? 0) + 1 };

    const { error } = await supabase.from('battles').update(patch).eq('room_code', room);
    if (error) {
      setErr(error.message);
      setCooldown(0);
    }
  }

  if (loading) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Ghosthavn Live Vote</h1>
        <p>Loading room…</p>
      </main>
    );
  }

  if (err) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Ghosthavn Live Vote</h1>
        <p style={{ color: 'tomato' }}>{err}</p>
        <p>Room: <b>{room}</b></p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <h1>Ghosthavn Live Vote</h1>
      <p><strong>Room:</strong> {room}</p>

      <div style={{ marginTop: 16, padding: 16, borderRadius: 14, border: '1px solid rgba(255,255,255,.12)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ opacity: 0.8 }}>Rapper A</div>
            <div style={{ fontSize: 36, fontWeight: 800 }}>{battle?.a_votes ?? 0}</div>
          </div>
          <div>
            <div style={{ opacity: 0.8, textAlign: 'right' }}>Rapper B</div>
            <div style={{ fontSize: 36, fontWeight: 800, textAlign: 'right' }}>{battle?.b_votes ?? 0}</div>
          </div>
        </div>

        <div style={{ marginTop: 10, height: 10, borderRadius: 999, background: 'rgba(255,255,255,.12)', overflow: 'hidden' }}>
          <div style={{ width: `${aPct}%`, height: '100%' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, opacity: 0.8 }}>
          <span>{aPct}%</span>
          <span>{bPct}%</span>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
          <button
            onClick={() => vote('A')}
            disabled={!battle?.is_live || cooldown > 0}
            style={{ flex: 1, padding: '12px 14px', borderRadius: 14 }}
          >
            Vote Rapper A {cooldown > 0 ? `(${cooldown})` : ''}
          </button>

          <button
            onClick={() => vote('B')}
            disabled={!battle?.is_live || cooldown > 0}
            style={{ flex: 1, padding: '12px 14px', borderRadius: 14 }}
          >
            Vote Rapper B {cooldown > 0 ? `(${cooldown})` : ''}
          </button>
        </div>

        <p style={{ marginTop: 12, opacity: 0.8 }}>
          {battle?.is_live ? 'LIVE: votes update for everyone.' : 'Host must start the battle.'}
          {endsInSec !== null ? ` Ends in: ${endsInSec}s` : ''}
        </p>

        <p style={{ marginTop: 6, opacity: 0.6 }}>
          Note: This is now Supabase-backed (not localStorage).
        </p>
      </div>
    </main>
  );
}
