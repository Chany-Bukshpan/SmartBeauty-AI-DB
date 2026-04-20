import { io } from 'socket.io-client';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim();
const SOCKET_URL =
  API_BASE
    ? API_BASE.replace(/\/api\/?$/, '')
    : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

export const chatSocket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});
