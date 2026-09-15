import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('http://localhost:4000', {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket?.id);
    });
    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });
  }
  return socket;
}
