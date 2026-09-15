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

export default function JoinRoom() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const router = useRouter();

  const handleJoin = () => {
    const user = getUserInfo();
    if (!user) { router.push('/login'); return; }
    
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setError('Please enter a room code'); return; }
    setError('');
    setJoining(true);

    const socket = getSocket();

    socket.emit('join_room', { roomId: trimmed, username: user.username });

    socket.once('player_joined', ({ allPlayers }: any) => {
      const roomData = { roomId: trimmed, problem: null, opponentUsername: allPlayers.find((u: string) => u !== user.username) };
      sessionStorage.setItem('codebattle_room', JSON.stringify(roomData));
      setJoining(false);
      router.push(`/battle/lobby?code=${trimmed}&mode=joined`);
    });

    socket.once('error', ({ message }: any) => {
      setError(message);
      setJoining(false);
    });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex items-center justify-center p-8 font-sans">
      <div className="max-w-sm w-full space-y-8">
        <div className="text-center">
          <Link href="/battle" className="text-neutral-600 hover:text-neutral-400 text-sm transition-colors">← Back</Link>
          <h1 className="text-4xl font-black mt-4">JOIN ROOM</h1>
          <p className="text-neutral-500 mt-2">Enter the room code from your friend</p>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="BATTLE-XXXXXX"
            maxLength={14}
            className="w-full bg-neutral-900 border border-neutral-700 text-white font-mono font-bold text-2xl text-center px-6 py-5 rounded-2xl outline-none focus:border-emerald-500 transition-colors tracking-[0.2em] uppercase placeholder:text-neutral-700"
            autoFocus
          />

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm font-medium text-center">
              ⚠ {error}
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={joining || !code.trim()}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-700 disabled:text-neutral-500 text-neutral-950 font-bold text-xl py-5 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {joining ? '⏳ Joining...' : '🚪 JOIN BATTLE'}
          </button>
        </div>
      </div>
    </div>
  );
}
