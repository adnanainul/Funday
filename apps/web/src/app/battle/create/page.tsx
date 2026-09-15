'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSocket } from '@/lib/socket';

function getUserInfo() {
  const stored = localStorage.getItem('codebattle_user');
  if (stored) return JSON.parse(stored);
  const username = 'Player' + Math.floor(Math.random() * 9000 + 1000);
  const data = { username, rating: 1000 };
  localStorage.setItem('codebattle_user', JSON.stringify(data));
  return data;
}

export default function CreateRoom() {
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const handleCreate = () => {
    setCreating(true);
    const user = getUserInfo();
    const socket = getSocket();
    socket.emit('create_room', { username: user.username });
    socket.once('room_created', ({ roomId }: any) => {
      localStorage.setItem('codebattle_room', JSON.stringify({ roomId, problem: null, opponentUsername: null }));
      setCreating(false);
      router.push(`/battle/lobby?code=${roomId}&mode=created`);
    });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex items-center justify-center p-8 font-sans">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 p-8 rounded-3xl shadow-2xl space-y-8">
        <div className="text-center">
          <Link href="/battle" className="text-neutral-600 hover:text-neutral-400 text-sm transition-colors">← Back</Link>
          <h1 className="text-3xl font-black mt-4">Create Battle</h1>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-neutral-400">PLAYERS</label>
            <div className="w-full bg-neutral-950 p-4 rounded-xl border border-neutral-800 font-medium">2</div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-neutral-400">PROBLEM</label>
            <div className="w-full bg-neutral-950 p-4 rounded-xl border border-neutral-800 font-medium text-emerald-400">
              Random Easy 🎲
            </div>
            <p className="text-xs text-neutral-600">A random easy DSA problem will be assigned when both players are ready.</p>
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-700 text-neutral-950 font-bold text-xl py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {creating ? '⏳ Creating...' : '⚔ CREATE BATTLE'}
        </button>
      </div>
    </div>
  );
}
