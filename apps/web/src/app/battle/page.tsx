'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSocket } from '@/lib/socket';

function getUserInfo() {
  if (typeof window === 'undefined') return null;
  const stored = sessionStorage.getItem('codebattle_user');
  if (stored) return JSON.parse(stored);
  return null;
}

export default function BattleMenu() {
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const handlePlayRandom = () => {
    const user = getUserInfo();
    if (!user) { router.push('/login'); return; }
    setSearching(true);
    const socket = getSocket();
    socket.emit('join_queue', { username: user.username });
    socket.once('match_found', ({ roomId, problem, opponent }: any) => {
      sessionStorage.setItem('codebattle_room', JSON.stringify({ roomId, problem, opponentUsername: opponent.username }));
      setSearching(false);
      router.push(`/battle/lobby?code=${roomId}&mode=random`);
    });
  };

  const handleCreateRoom = () => {
    const user = getUserInfo();
    if (!user) { router.push('/login'); return; }
    setCreating(true);
    const socket = getSocket();
    socket.emit('create_room', { username: user.username });
    socket.once('room_created', ({ roomId }: any) => {
      // Clear any previous opponent — fresh room, no opponent yet
      sessionStorage.setItem('codebattle_room', JSON.stringify({ roomId, problem: null, opponentUsername: null }));
      setCreating(false);
      router.push(`/battle/lobby?code=${roomId}&mode=created`);
    });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex items-center justify-center p-8 font-sans">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="text-neutral-600 hover:text-neutral-400 text-sm transition-colors">← Back</Link>
          <h1 className="text-4xl font-black mt-4">1 V 1 BATTLE</h1>
          <p className="text-neutral-500 mt-2">Choose how you want to battle</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handlePlayRandom}
            disabled={searching}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-700 text-neutral-950 font-bold text-xl py-5 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 shadow-[0_0_30px_-8px_rgba(16,185,129,0.5)]"
          >
            {searching ? (
              <><span className="animate-spin inline-block w-5 h-5 border-2 border-neutral-950/30 border-t-neutral-950 rounded-full"></span> Finding opponent...</>
            ) : (
              '⚡ PLAY RANDOM'
            )}
          </button>

          <button
            onClick={handleCreateRoom}
            disabled={creating}
            className="w-full bg-neutral-800 hover:bg-neutral-700 disabled:opacity-60 text-white font-bold text-xl py-5 rounded-2xl border border-neutral-700 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
          >
            {creating ? '⏳ Creating...' : '🔧 CREATE ROOM'}
          </button>

          <Link
            href="/battle/join"
            className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xl py-5 rounded-2xl border border-neutral-700 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 block text-center"
          >
            🚪 JOIN WITH CODE
          </Link>
        </div>

        <div className="text-center">
          <Link href="/tournament" className="text-neutral-500 hover:text-white transition-colors text-sm">
            🏆 Create 8-Player Tournament instead →
          </Link>
        </div>
      </div>
    </div>
  );
}
