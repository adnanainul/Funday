'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';

function getUserInfo() {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('codebattle_user');
  if (stored) return JSON.parse(stored);
  return null;
}

type LiveBattle = { roomId: string; p1: string; p2: string; problemTitle: string };

export default function Home() {
  const [liveBattles, setLiveBattles] = useState<LiveBattle[]>([]);
  const [searching, setSearching] = useState(false);
  const [username, setUsername] = useState('');
  const router = useRouter();

  useEffect(() => {
    const user = getUserInfo();
    if (!user) {
      router.push('/login');
      return;
    }
    setUsername(user.username);

    // Fetch live battles
    const fetchLive = () => {
      fetch('http://localhost:4000/api/live-battles')
        .then(r => r.json())
        .then(setLiveBattles)
        .catch(() => {});
    };
    fetchLive();
    const interval = setInterval(fetchLive, 5000);
    return () => clearInterval(interval);
  }, [router]);

  const handlePlayRandom = () => {
    setSearching(true);
    const user = getUserInfo();
    const socket = getSocket();

    socket.emit('join_queue', { username: user.username });
    socket.once('match_found', ({ roomId, problem, opponent }: any) => {
      // Save battle context
      localStorage.setItem('codebattle_room', JSON.stringify({ roomId, problem, opponentUsername: opponent.username }));
      setSearching(false);
      router.push(`/battle/lobby?code=${roomId}&mode=random`);
    });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col items-center justify-center p-8 font-sans relative">
      
      {/* Profile Button */}
      <div className="absolute top-8 right-8">
        <Link href="/profile" className="flex items-center gap-3 hover:bg-neutral-900 p-2 pr-4 rounded-full transition-colors border border-transparent hover:border-neutral-800">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-neutral-950 font-black">
            {username ? username.charAt(0).toUpperCase() : '?'}
          </div>
          <span className="font-bold text-sm hidden sm:block">{username}</span>
        </Link>
      </div>

      <main className="max-w-4xl w-full flex flex-col items-center text-center space-y-12">

        <div className="space-y-4">
          <div className="text-sm font-bold text-emerald-400 tracking-[0.3em] uppercase">Welcome back, {username}</div>
          <h1 className="text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
            READY TO CODE?
          </h1>
          <p className="text-xl text-neutral-400 max-w-2xl mx-auto">
            Challenge your friends. Solve easy problems. Be the fastest.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg justify-center">
          <button
            onClick={handlePlayRandom}
            disabled={searching}
            className="flex-1 relative bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-700 text-neutral-950 font-bold text-xl py-6 rounded-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]"
          >
            {searching ? (
              <>
                <span className="animate-spin inline-block w-5 h-5 border-2 border-neutral-950/30 border-t-neutral-950 rounded-full"></span>
                Finding opponent...
              </>
            ) : (
              <><span className="text-2xl">⚔</span> PLAY 1 V 1</>
            )}
          </button>
          <Link
            href="/contest"
            className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xl py-6 rounded-2xl border border-neutral-700 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
          >
            <span className="text-2xl">🏆</span> JOIN CONTEST
          </Link>
        </div>

        <div className="flex gap-4 text-neutral-500">
          <Link href="/battle" className="hover:text-white transition-colors flex items-center gap-2 font-medium text-sm">
            <span>⚔</span> Create / Join Room
          </Link>
          <span>·</span>
          <Link href="/tournament" className="hover:text-white transition-colors flex items-center gap-2 font-medium text-sm">
            <span>🥊</span> Tournament
          </Link>
          <span>·</span>
          <Link href="/watch" className="hover:text-white transition-colors flex items-center gap-2 font-medium text-sm">
            <span>👁</span> Watch Live
          </Link>
        </div>

        {/* Live Battles */}
        <div className="w-full pt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
              LIVE BATTLES
              {liveBattles.length > 0 && (
                <span className="text-sm font-normal text-neutral-500">({liveBattles.length} active)</span>
              )}
            </h2>
            <Link href="/watch" className="text-neutral-400 hover:text-white transition-colors flex items-center gap-2 text-sm">
              WATCH ALL <span>👁</span>
            </Link>
          </div>

          {liveBattles.length === 0 ? (
            <div className="bg-neutral-900/50 border border-dashed border-neutral-800 rounded-2xl p-12 text-neutral-600 font-medium">
              No live battles yet. Be the first to fight! ⚔
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveBattles.map((battle) => (
                <Link
                  key={battle.roomId}
                  href={`/watch/${battle.roomId}`}
                  className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex flex-col gap-3 hover:border-neutral-700 transition-all hover:scale-[1.01] cursor-pointer group"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 text-lg font-bold">
                      <span>{battle.p1}</span>
                      <span className="text-neutral-600 text-sm font-normal">⚔</span>
                      <span>{battle.p2}</span>
                    </div>
                    <span className="px-2.5 py-1 bg-red-500/10 text-red-400 text-xs font-bold rounded-full border border-red-500/20">
                      🔴 LIVE
                    </span>
                  </div>
                  <div className="text-sm text-neutral-500">
                    Problem: <span className="text-neutral-300 font-medium">{battle.problemTitle}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
