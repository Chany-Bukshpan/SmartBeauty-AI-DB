import { io } from 'socket.io-client';

/**
 * Socket.IO רץ על שרת ה-API (Express), לא על אתר הסטטיק (למשל makeup-store-*.onrender.com).
 * לכן אסור להשתמש ב-window.location.origin בפרודקשן כשהפרונט וה-API על דומיינים שונים.
 */
function resolveSocketOrigin() {
  const strip = (u) => String(u || '').trim().replace(/\/$/, '');
  const fromSocket = strip(import.meta.env.VITE_SOCKET_URL);
  if (fromSocket) return fromSocket;

  const fromApi = strip((import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/?$/, ''));
  if (fromApi) return fromApi;

  const fromProxy = strip(import.meta.env.VITE_API_PROXY_TARGET);
  if (import.meta.env.DEV) {
    return fromProxy || 'http://localhost:3000';
  }
  return fromProxy || 'https://final-project-n18z.onrender.com';
}

const SOCKET_URL = 'https://final-project-n18z.onrender.com';


export const chatSocket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});
