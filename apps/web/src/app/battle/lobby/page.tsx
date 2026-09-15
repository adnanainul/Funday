'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSocket } from '@/lib/socket';

function getUserInfo() {
  if (typeof window === 'undefined') return null;
  const stored = sessionStorage.getItem('codebattle_user');
  if (stored) return JSON.parse(stored);
  return null;
}

type CountdownState = null | 3 | 2 | 1 | 0;

export default function Lobby() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code') || '';
  const mode = searchParams.get('mode') || '';
  const router = useRouter();

  const [myUsername, setMyUsername] = useState('');
  const [opponent, setOpponent] = useState<string | null>(null);
  const [myReady, setMyReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [countdown, setCountdown] = useState<CountdownState>(null);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState('Waiting for opponent...');

  useEffect(() => {
    const user = getUserInfo();
    if (!user) { router.push('/login'); return; }
    setMyUsername(user.username);

    const socket = getSocket();

    // If we already joined, we need to re-register in the socket room
    const roomData = JSON.parse(sessionStorage.getItem('codebattle_room') || '{}');

    // If we already joined (not creator), opponent might already be there
    if (mode !== 'created' && roomData.opponentUsername) {
      setOpponent(roomData.opponentUsername);
      setStatus('Opponent found! Click READY when you\'re set.');
    }

    // If we just created the room, emit join to register socket in room
    if (mode === 'created') {
      socket.emit('join_room', { roomId: code, username: user.username });
    }

    // If we're the joiner, emit join_room to register with server
    if (mode === 'joined') {
      socket.emit('join_room', { roomId: code, username: user.username });
    }

    const onPlayerJoined = ({ allPlayers }: any) => {
      const opp = allPlayers.find((u: string) => u !== user.username);
      if (opp) {
        setOpponent(opp);
        setStatus('Opponent found! Click READY when you\'re set.');
        // Update stored room data
        const rd = JSON.parse(sessionStorage.getItem('codebattle_room') || '{}');
        rd.opponentUsername = opp;
        sessionStorage.setItem('codebattle_room', JSON.stringify(rd));
      }
    };

    const onOpponentReady = () => {
      setOpponentReady(true);
    };

    const onCountdown = ({ count, text }: any) => {
      setCountdown(count as CountdownState);
      if (count === 0) {
        setTimeout(() => {
          router.push(`/battle/arena?code=${code}`);
        }, 600);
      }
    };

    const onBattleStart = ({ problem }: any) => {
      // Store problem
      const rd = JSON.parse(sessionStorage.getItem('codebattle_room') || '{}');
      rd.problem = problem;
      sessionStorage.setItem('codebattle_room', JSON.stringify(rd));
    };

    const onOpponentLeft = () => {
      setOpponent(null);
      setOpponentReady(false);
      setStatus('Opponent left! Waiting for someone else to join...');
      const rd = JSON.parse(sessionStorage.getItem('codebattle_room') || '{}');
      rd.opponentUsername = null;
      sessionStorage.setItem('codebattle_room', JSON.stringify(rd));
    };

    // Handle socket errors — if room not found (e.g. server restarted), recreate it
    const onSocketError = ({ message }: { message: string }) => {
      if (message === 'Room not found' && mode === 'created') {
        // Server lost the room (restart). Re-create it with a fresh room.
        setStatus('Reconnecting... recreating your room.');
        socket.emit('create_room', { username: user.username });
        socket.once('room_created', ({ roomId: newRoomId }: any) => {
          sessionStorage.setItem('codebattle_room', JSON.stringify({ roomId: newRoomId, problem: null, opponentUsername: null }));
          // Navigate to the new lobby URL
          router.replace(`/battle/lobby?code=${newRoomId}&mode=created`);
        });
      } else if (message === 'Room not found' || message === 'Room is full') {
        setStatus(`❌ ${message}. Go back and try again.`);
      }
    };

    // Handle socket reconnect — re-register in the room
    const onReconnect = () => {
      if (mode === 'created' || mode === 'joined') {
        socket.emit('join_room', { roomId: code, username: user.username });
      }
    };

    socket.on('player_joined', onPlayerJoined);
    socket.on('opponent_ready', onOpponentReady);
    socket.on('countdown', onCountdown);
    socket.on('battle_start', onBattleStart);
    socket.on('opponent_left_lobby', onOpponentLeft);
    socket.on('error', onSocketError);
    socket.on('reconnect', onReconnect);

    return () => {
      socket.off('player_joined', onPlayerJoined);
      socket.off('opponent_ready', onOpponentReady);
      socket.off('countdown', onCountdown);
      socket.off('battle_start', onBattleStart);
      socket.off('opponent_left_lobby', onOpponentLeft);
      socket.off('error', onSocketError);
      socket.off('reconnect', onReconnect);
    };
  }, [code, mode, router]);

  const handleReady = useCallback(() => {
    if (myReady) return;
    setMyReady(true);
    const socket = getSocket();
    socket.emit('player_ready', { roomId: code });
    setStatus('You\'re ready! Waiting for opponent...');
  }, [code, myReady]);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Avatar colors
  const avatarColors = [
    'from-indigo-500 to-purple-600',
    'from-orange-400 to-red-500',
    'from-emerald-400 to-teal-600',
    'from-pink-500 to-rose-600',
  ];
  const myColor = avatarColors[0];
  const oppColor = avatarColors[1];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col items-center justify-center p-8 font-sans relative">

      {/* Room code bar */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center space-y-2">
        <p className="text-neutral-600 font-bold text-xs tracking-[0.3em]">ROOM CODE</p>
        <button
          onClick={copyCode}
          className="text-2xl font-mono font-black text-white bg-neutral-900 px-8 py-3 rounded-2xl border border-neutral-800 hover:border-neutral-600 transition-colors flex items-center gap-3"
        >
          {code}
          <span className="text-sm text-neutral-500">{copied ? '✓ Copied!' : '📋'}</span>
        </button>
      </div>

      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur flex items-center justify-center z-50">
          <div className={`text-9xl font-black transition-all duration-300 ${countdown > 0 ? 'text-white scale-100' : 'text-emerald-400 scale-125'}`}>
            {countdown > 0 ? countdown : 'GO!'}
          </div>
        </div>
      )}

      {/* Players */}
      <div className="w-full max-w-4xl flex flex-col md:flex-row items-center justify-between gap-12 mt-20">

        {/* Me */}
        <div className="flex-1 flex flex-col items-center gap-6">
          <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${myColor} shadow-[0_0_0_4px_rgba(0,0,0,1),0_0_0_6px_rgba(79,70,229,0.4)]`}></div>
          <div className="text-center">
            <h2 className="text-2xl font-bold">{myUsername} <span className="text-neutral-500 text-base font-normal">(You)</span></h2>
            <p className="text-neutral-500 font-mono text-sm mt-1">⚡ 1000</p>
          </div>
          {!myReady ? (
            <button
              onClick={handleReady}
              disabled={!opponent}
              className="px-8 py-3 rounded-full font-bold text-lg bg-neutral-800 hover:bg-emerald-500 hover:text-neutral-950 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all hover:scale-105 active:scale-95 border border-neutral-700"
            >
              {opponent ? 'CLICK TO READY' : 'Waiting...'}
            </button>
          ) : (
            <div className="px-8 py-3 rounded-full font-bold text-lg bg-emerald-500 text-neutral-950 flex items-center gap-2">
              ✓ READY
            </div>
          )}
        </div>

        <div className="text-5xl font-black text-neutral-800 italic select-none">VS</div>

        {/* Opponent */}
        <div className="flex-1 flex flex-col items-center gap-6">
          {opponent ? (
            <>
              <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${oppColor} shadow-[0_0_0_4px_rgba(0,0,0,1),0_0_0_6px_rgba(249,115,22,0.4)]`}></div>
              <div className="text-center">
                <h2 className="text-2xl font-bold">{opponent}</h2>
                <p className="text-neutral-500 font-mono text-sm mt-1">⚡ 1000</p>
              </div>
              <div className={`px-8 py-3 rounded-full font-bold text-lg border transition-all ${opponentReady ? 'bg-emerald-500 text-neutral-950 border-emerald-500' : 'bg-neutral-900 text-neutral-500 border-neutral-800'}`}>
                {opponentReady ? '✓ READY' : 'Not ready yet...'}
              </div>
            </>
          ) : (
            <>
              <div className="w-28 h-28 rounded-full border-4 border-dashed border-neutral-800 flex items-center justify-center text-5xl text-neutral-700 font-black animate-pulse">
                ?
              </div>
              <div className="text-center">
                <h2 className="text-lg font-medium text-neutral-600">
                  {mode === 'created' || mode === 'joined' ? 'Share the room code above ↑' : 'Searching...'}
                </h2>
                <p className="text-neutral-700 text-sm mt-1">Waiting for someone to join</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status bar */}
      {countdown === null && (
        <div className="mt-12 text-neutral-500 text-sm font-medium">
          {status}
        </div>
      )}
    </div>
  );
}
