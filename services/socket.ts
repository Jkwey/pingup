import { io, Socket } from 'socket.io-client';
import { API_URL } from './api';

let socket: Socket | null = null;

export function connectSocket(userId: string): Socket {
  if (socket?.connected) return socket;

  socket = io(API_URL, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    socket?.emit('join', userId);
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function joinChatRoom(roomId: string) {
  socket?.emit('join_room', roomId);
}

export function leaveChatRoom(roomId: string) {
  socket?.emit('leave_room', roomId);
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
