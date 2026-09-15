import express, { Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server, Socket } from 'socket.io';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { exec } from 'child_process';

import { Problem, getRandomProblem, getProblemById } from './problems';
import { executeCode, ExecutionResult } from './executor';

dotenv.config();

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface QueuedPlayer {
  socketId: string;
  username: string;
}

interface PlayerState {
  socketId: string;
  username: string;
  ready: boolean;
  submitted: boolean;
}

interface RoomState {
  roomId: string;
  players: PlayerState[];
  problem: Problem;
  status: 'WAITING' | 'STARTING' | 'IN_PROGRESS' | 'COMPLETED';
  startTime?: number;
  timeLimit: number; // ms — default 5 min
  timerInterval?: NodeJS.Timeout;
  winnerId?: string;
  winnerUsername?: string;
}

interface LiveBattleInfo {
  roomId: string;
  p1: string;
  p2: string;
  problemTitle: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory state
// ─────────────────────────────────────────────────────────────────────────────
const rooms = new Map<string, RoomState>();
const matchmakingQueue: QueuedPlayer[] = [];
const liveRooms = new Map<string, LiveBattleInfo>();

interface ContestPlayer {
  username: string;
  score: number;
  solvedSet: Set<string>;
}
const globalContest = {
  startTime: Date.now(),
  endTime: Date.now() + 2 * 60 * 60 * 1000, // 2 hours from server start
  players: new Map<string, ContestPlayer>() // socketId -> player
};

// ─── User store (in-memory, persists while server is running) ─────────────────
interface UserRecord {
  username: string;
  password: string; // plain text — this is a dev platform, not production
  wins: number;
  createdAt: number;
}
const usersDb = new Map<string, UserRecord>(); // username -> UserRecord

function getContestLeaderboard() {
  return Array.from(globalContest.players.values())
    .sort((a, b) => b.score - a.score)
    .map(p => ({ name: p.username, score: p.score, solved: p.solvedSet.size }))
    .slice(0, 50);
}

// ─────────────────────────────────────────────────────────────────────────────
// Express + HTTP + Socket.IO setup
// ─────────────────────────────────────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

setInterval(() => {
  const remaining = Math.max(0, globalContest.endTime - Date.now());
  io.to('global_contest').emit('contest_tick', { timeRemaining: remaining });
}, 1000);

app.use(cors({ origin: '*' }));
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────────────────────
function generateRoomId(): string {
  return (
    'BATTLE-' +
    Math.random().toString(36).toUpperCase().slice(2, 8)
  );
}

/** Strip testCases from a Problem before sending to clients */
function sanitiseProblem(problem: Problem): Omit<Problem, 'testCases'> {
  const { testCases, ...safe } = problem;
  return safe;
}

/** Find the room a socket currently belongs to */
function findRoomBySocket(socketId: string): RoomState | undefined {
  for (const room of rooms.values()) {
    if (room.players.some((p) => p.socketId === socketId)) {
      return room;
    }
  }
  return undefined;
}

/** Transition a room to COMPLETED and clean up timer + liveRooms */
function completeRoom(room: RoomState): void {
  room.status = 'COMPLETED';
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = undefined;
  }
  liveRooms.delete(room.roomId);
}

/** Start the server-side countdown then the battle timer */
async function startBattle(room: RoomState): Promise<void> {
  room.status = 'STARTING';

  // Emit countdown 3 → 2 → 1 → GO
  for (let count = 3; count >= 0; count--) {
    io.to(room.roomId).emit('countdown', {
      count,
      text: count === 0 ? 'GO!' : String(count),
    });
    if (count > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Transition to IN_PROGRESS
  room.status = 'IN_PROGRESS';
  room.startTime = Date.now();

  // Register in liveRooms
  liveRooms.set(room.roomId, {
    roomId: room.roomId,
    p1: room.players[0]?.username ?? '',
    p2: room.players[1]?.username ?? '',
    problemTitle: room.problem.title,
  });

  // Emit battle_start (no testCases)
  io.to(room.roomId).emit('battle_start', {
    problem: sanitiseProblem(room.problem),
    timeLimit: room.timeLimit,
  });

  // Server-side countdown timer (tick every second)
  room.timerInterval = setInterval(() => {
    if (!room.startTime) return;

    const remaining = room.timeLimit - (Date.now() - room.startTime);

    if (remaining <= 0) {
      completeRoom(room);
      io.to(room.roomId).emit('battle_end', {
        winnerId: null,
        winnerUsername: null,
        reason: 'Time limit reached',
      });
      return;
    }

    io.to(room.roomId).emit('timer_tick', { remaining });
  }, 1000);
}

// ─────────────────────────────────────────────────────────────────────────────
// REST Endpoints
// ─────────────────────────────────────────────────────────────────────────────

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// ── Auth: Register ──────────────────────────────────────────────────────────
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { username, password } = req.body as { username: string; password: string };
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required.' });
    return;
  }
  const trimmed = username.trim().toLowerCase();
  if (trimmed.length < 3 || trimmed.length > 20) {
    res.status(400).json({ error: 'Username must be 3-20 characters.' });
    return;
  }
  if (!/^[a-z0-9_]+$/.test(trimmed)) {
    res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores.' });
    return;
  }
  if (usersDb.has(trimmed)) {
    res.status(409).json({ error: 'Username already taken.' });
    return;
  }
  const user: UserRecord = { username: trimmed, password, wins: 0, createdAt: Date.now() };
  usersDb.set(trimmed, user);
  console.log(`[Auth] New user registered: ${trimmed}`);
  res.json({ username: trimmed, wins: 0 });
});

// ── Auth: Login ─────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body as { username: string; password: string };
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required.' });
    return;
  }
  const trimmed = username.trim().toLowerCase();
  const user = usersDb.get(trimmed);
  if (!user || user.password !== password) {
    res.status(401).json({ error: 'Invalid username or password.' });
    return;
  }
  console.log(`[Auth] Login: ${trimmed}`);
  res.json({ username: trimmed, wins: user.wins });
});

// ── Profile: Get user ───────────────────────────────────────────────────────
app.get('/api/profile/:username', (req: Request, res: Response) => {
  const username = req.params.username.toLowerCase();
  const user = usersDb.get(username);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  res.json({ username: user.username, wins: user.wins, createdAt: user.createdAt });
});

// ── Profile: Increment wins (called internally when battle ends) ─────────────
app.post('/api/profile/wins', (req: Request, res: Response) => {
  const { username } = req.body as { username: string };
  const user = usersDb.get(username?.toLowerCase());
  if (!user) { res.status(404).json({ error: 'User not found.' }); return; }
  user.wins += 1;
  console.log(`[Auth] Win recorded for ${username}. Total wins: ${user.wins}`);
  res.json({ username: user.username, wins: user.wins });
});


// Live battles list
app.get('/api/live-battles', (_req: Request, res: Response) => {
  res.json(Array.from(liveRooms.values()));
});

// Get all problems (for contests)
app.get('/api/problems', (_req: Request, res: Response) => {
  const { PROBLEMS } = require('./problems');
  // Strip testCases before sending to client
  const safeProblems = PROBLEMS.map((p: any) => sanitiseProblem(p));
  res.json(safeProblems);
});

// Run code against sample test cases
app.post('/api/run', async (req: Request, res: Response) => {
  const { code, language, problemId } = req.body as {
    code: string;
    language: string;
    problemId: string;
  };

  if (!code || !language || !problemId) {
    res.status(400).json({ error: 'code, language, and problemId are required.' });
    return;
  }

  const problem = getProblemById(problemId);
  if (!problem) {
    res.status(404).json({ error: `Problem not found: ${problemId}` });
    return;
  }

  try {
    const result = await executeCode(
      code,
      language,
      problem.functionName,
      problem.sampleTestCases,
    );
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// Submit code against all test cases
app.post('/api/submit', async (req: Request, res: Response) => {
  const { code, language, problemId, roomId, socketId, username } = req.body as {
    code: string;
    language: string;
    problemId: string;
    roomId?: string;
    socketId?: string;
    username?: string;
  };

  if (!code || !language || !problemId) {
    res.status(400).json({ error: 'code, language, and problemId are required.' });
    return;
  }

  const problem = getProblemById(problemId);
  if (!problem) {
    res.status(404).json({ error: `Problem not found: ${problemId}` });
    return;
  }

  let result: ExecutionResult;
  try {
    result = await executeCode(
      code,
      language,
      problem.functionName,
      problem.testCases,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
    return;
  }

  // If Accepted and battle room exists + not yet completed → set winner
  if (result.status === 'Accepted') {
    if (roomId) {
      const room = rooms.get(roomId);
      if (room && room.status === 'IN_PROGRESS' && !room.winnerId) {
        // Find the submitting player
        const player = room.players.find((p) => p.socketId === socketId);
        if (player) {
          player.submitted = true;
          room.winnerId = player.socketId;
          room.winnerUsername = player.username;
          
          // Increment wins
          const u = usersDb.get(player.username.toLowerCase());
          if (u) {
            u.wins += 1;
            console.log(`[Auth] ${player.username} won! Total wins: ${u.wins}`);
          }

          completeRoom(room);

          io.to(roomId).emit('battle_end', {
            winnerId: room.winnerId,
            winnerUsername: room.winnerUsername,
            reason: 'Accepted',
          });
        }
      }
    } else if (socketId && username) {
      // Global contest submission
      let player = globalContest.players.get(socketId);
      if (!player) {
        player = { username, score: 0, solvedSet: new Set() };
        globalContest.players.set(socketId, player);
      }
      if (!player.solvedSet.has(problemId)) {
        player.solvedSet.add(problemId);
        player.score += 100;
        io.to('global_contest').emit('contest_update', {
          participants: globalContest.players.size,
          leaderboard: getContestLeaderboard()
        });
      }
    }
  }

  res.json(result);
});

// ─────────────────────────────────────────────────────────────────────────────
// Socket.IO Events
// ─────────────────────────────────────────────────────────────────────────────
io.on('connection', (socket: Socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // ── join_contest ───────────────────────────────────────────────────────────
  socket.on('join_contest', ({ username }: { username: string }) => {
    socket.join('global_contest');
    let player = globalContest.players.get(socket.id);
    if (!player) {
      player = { username, score: 0, solvedSet: new Set() };
      globalContest.players.set(socket.id, player);
    }
    
    // Broadcast updated contest state
    io.to('global_contest').emit('contest_update', {
      participants: globalContest.players.size,
      leaderboard: getContestLeaderboard(),
      timeRemaining: Math.max(0, globalContest.endTime - Date.now())
    });
  });

  // ── join_queue ─────────────────────────────────────────────────────────────
  socket.on('join_queue', ({ username }: { username: string }) => {
    // Prevent duplicate queue entries for the same socket
    if (!matchmakingQueue.some((q) => q.socketId === socket.id)) {
      matchmakingQueue.push({ socketId: socket.id, username });
    }

    console.log(`[Queue] ${username} (${socket.id}) joined. Queue size: ${matchmakingQueue.length}`);

    // Pair first two players if available
    if (matchmakingQueue.length >= 2) {
      const [p1, p2] = matchmakingQueue.splice(0, 2);
      const roomId = generateRoomId();
      const problem = getRandomProblem();

      const room: RoomState = {
        roomId,
        players: [
          { socketId: p1.socketId, username: p1.username, ready: false, submitted: false },
          { socketId: p2.socketId, username: p2.username, ready: false, submitted: false },
        ],
        problem,
        status: 'WAITING',
        timeLimit: 300_000, // 5 minutes
      };
      rooms.set(roomId, room);

      // Both sockets join the socket.io room
      const p1Socket = io.sockets.sockets.get(p1.socketId);
      const p2Socket = io.sockets.sockets.get(p2.socketId);
      p1Socket?.join(roomId);
      p2Socket?.join(roomId);

      // Notify p1
      p1Socket?.emit('match_found', {
        roomId,
        problem: sanitiseProblem(problem),
        opponent: { username: p2.username },
      });

      // Notify p2
      p2Socket?.emit('match_found', {
        roomId,
        problem: sanitiseProblem(problem),
        opponent: { username: p1.username },
      });

      console.log(`[Match] ${p1.username} vs ${p2.username} in room ${roomId}`);
    }
  });

  // ── create_room ────────────────────────────────────────────────────────────
  socket.on(
    'create_room',
    ({ username, problemId }: { username: string; problemId?: string }) => {
      const roomId = generateRoomId();
      const problem = problemId ? getProblemById(problemId) ?? getRandomProblem() : getRandomProblem();

      const room: RoomState = {
        roomId,
        players: [
          { socketId: socket.id, username, ready: false, submitted: false },
        ],
        problem,
        status: 'WAITING',
        timeLimit: 300_000,
      };
      rooms.set(roomId, room);
      socket.join(roomId);

      socket.emit('room_created', { roomId });
      console.log(`[Room] ${username} created room ${roomId}`);
    },
  );

  // ── join_room ──────────────────────────────────────────────────────────────
  socket.on(
    'join_room',
    ({ roomId, username }: { roomId: string; username: string }) => {
      const room = rooms.get(roomId);

      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Check if player is already in room (by username) for reconnects
      const existingPlayer = room.players.find((p) => p.username === username);
      
      if (existingPlayer) {
        // Reconnect: update socket ID
        existingPlayer.socketId = socket.id;
      } else {
        if (room.players.length >= 2) {
          socket.emit('error', { message: 'Room is full' });
          return;
        }

        room.players.push({
          socketId: socket.id,
          username,
          ready: false,
          submitted: false,
        });
      }
      socket.join(roomId);

      io.to(roomId).emit('player_joined', {
        username,
        allPlayers: room.players.map((p) => p.username),
      });

      console.log(`[Room] ${username} joined room ${roomId}`);
    },
  );

  // ── player_ready ───────────────────────────────────────────────────────────
  socket.on('player_ready', ({ roomId }: { roomId: string }) => {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'WAITING') return;

    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) return;

    player.ready = true;
    console.log(`[Room] ${player.username} is ready in ${roomId}`);

    // Notify other players that this player is ready
    socket.to(roomId).emit('opponent_ready', { username: player.username });

    // Start only when ALL players are ready (minimum 2)
    const allReady =
      room.players.length >= 2 && room.players.every((p) => p.ready);
    if (allReady) {
      startBattle(room).catch((err) =>
        console.error(`[Battle] startBattle error in ${roomId}:`, err),
      );
    }
  });

  // ── typing ─────────────────────────────────────────────────────────────────
  socket.on('typing', ({ roomId }: { roomId: string }) => {
    socket.to(roomId).emit('opponent_typing');
  });

  // ── opponent activity notifications ────────────────────────────────────────
  socket.on('opponent_running_notify', ({ roomId }: { roomId: string }) => {
    socket.to(roomId).emit('opponent_running');
  });

  socket.on('opponent_submitted_notify', ({ roomId }: { roomId: string }) => {
    socket.to(roomId).emit('opponent_submitted');
  });

  // ── disconnect ─────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);

    // Remove from matchmaking queue
    const queueIdx = matchmakingQueue.findIndex((q) => q.socketId === socket.id);
    if (queueIdx !== -1) matchmakingQueue.splice(queueIdx, 1);

    // Handle active room
    const room = findRoomBySocket(socket.id);
    if (room && room.status === 'IN_PROGRESS') {
      const disconnectedPlayer = room.players.find((p) => p.socketId === socket.id);
      const remainingPlayer = room.players.find((p) => p.socketId !== socket.id);
      
      completeRoom(room);
      
      io.to(room.roomId).emit('opponent_disconnected', {
        username: disconnectedPlayer?.username,
      });
      
      console.log(`[Room] ${disconnectedPlayer?.username} disconnected from room ${room.roomId}`);

      if (remainingPlayer) {
        room.winnerId = remainingPlayer.socketId;
        room.winnerUsername = remainingPlayer.username;

        // Increment wins
        const u = usersDb.get(remainingPlayer.username.toLowerCase());
        if (u) {
          u.wins += 1;
          console.log(`[Auth] ${remainingPlayer.username} won by flee! Total wins: ${u.wins}`);
        }

        io.to(room.roomId).emit('battle_end', {
          winnerId: remainingPlayer.socketId,
          winnerUsername: remainingPlayer.username,
          reason: 'Opponent fled the battle!',
        });
      }
    } else if (room && (room.status === 'WAITING' || room.status === 'STARTING')) {
      const disconnectedPlayer = room.players.find((p) => p.socketId === socket.id);
      if (!disconnectedPlayer) return;

      // Give an 8-second grace period. React StrictMode and Fast Refresh disconnect
      // and immediately reconnect sockets. If the player truly left, they won't
      // reconnect and the room gets cleaned up after the delay.
      const existingTimeout = (room as any)._disconnectTimeout;
      if (existingTimeout) clearTimeout(existingTimeout);

      (room as any)._disconnectTimeout = setTimeout(() => {
        // Re-check: if the player reconnected (socketId changed), cancel deletion
        const stillDisconnected = room.players.find(
          (p) => p.username === disconnectedPlayer.username && p.socketId === socket.id
        );
        if (!stillDisconnected) {
          // Player reconnected with a new socket ID — all good, do nothing
          console.log(`[Room] ${disconnectedPlayer.username} reconnected to lobby ${room.roomId}. Room intact.`);
          return;
        }

        // Player truly left — remove them
        room.players = room.players.filter((p) => p.username !== disconnectedPlayer.username);

        if (room.players.length === 0) {
          rooms.delete(room.roomId);
          console.log(`[Room] Room ${room.roomId} deleted (last player left).`);
        } else {
          io.to(room.roomId).emit('opponent_left_lobby');
          console.log(`[Room] ${disconnectedPlayer.username} left lobby ${room.roomId}. Room still active.`);
        }
      }, 8000);

      console.log(`[Room] ${disconnectedPlayer.username} disconnected from lobby ${room.roomId}. Waiting 8s for reconnect...`);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 4000;

httpServer.listen(PORT, () => {
  console.log(`[Server] Code Battle server running on port ${PORT}`);
  console.log(`[Server] Health: http://localhost:${PORT}/health`);
  console.log(`[Server] Live battles: http://localhost:${PORT}/api/live-battles`);
});

export { app, httpServer, io };
