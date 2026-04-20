const waitingRooms = new Map();
const activeRooms = new Map();

const buildWaitingRoomsPayload = () =>
  Array.from(waitingRooms.values()).sort((a, b) => a.requestedAt - b.requestedAt);

export function registerChatSocket(io) {
  const broadcastWaitingRooms = () => {
    io.to('agents:lobby').emit('chat:waiting-rooms', buildWaitingRoomsPayload());
  };

  io.on('connection', (socket) => {
    socket.on('chat:user-join', (payload = {}) => {
      const roomId = String(payload.roomId || '').trim();
      const userName = String(payload.userName || 'לקוח').trim();
      if (!roomId) return;
      socket.join(roomId);
      socket.data.role = 'user';
      socket.data.roomId = roomId;
      socket.data.userName = userName;
    });

    socket.on('chat:request-agent', (payload = {}) => {
      const roomId = String(payload.roomId || socket.data.roomId || '').trim();
      const userName = String(payload.userName || socket.data.userName || 'לקוח').trim();
      if (!roomId) return;
      waitingRooms.set(roomId, { roomId, userName, requestedAt: Date.now() });
      io.to(roomId).emit('chat:status', { type: 'waiting', roomId, userName });
      broadcastWaitingRooms();
    });

    socket.on('chat:agent-join-lobby', (payload = {}) => {
      socket.join('agents:lobby');
      socket.data.role = 'agent';
      socket.data.agentName = String(payload.agentName || 'נציג').trim();
      socket.emit('chat:waiting-rooms', buildWaitingRoomsPayload());
    });

    socket.on('chat:agent-claim-room', (payload = {}) => {
      const roomId = String(payload.roomId || '').trim();
      const agentName = String(payload.agentName || socket.data.agentName || 'נציג').trim();
      if (!roomId || !waitingRooms.has(roomId)) return;

      waitingRooms.delete(roomId);
      activeRooms.set(roomId, { agentName, startedAt: Date.now() });
      socket.join(roomId);

      io.to(roomId).emit('chat:agent-joined', { roomId, agentName });
      io.to('agents:lobby').emit('chat:room-claimed', { roomId, agentName });
      broadcastWaitingRooms();
    });

    socket.on('chat:message', (payload = {}) => {
      const roomId = String(payload.roomId || socket.data.roomId || '').trim();
      const text = String(payload.text || '').trim();
      if (!roomId || !text) return;

      const sender =
        String(payload.sender || '').trim() ||
        (socket.data.role === 'agent' ? socket.data.agentName || 'נציג' : 'לקוח');

      io.to(roomId).emit('chat:receive-message', {
        roomId,
        text,
        sender,
        timestamp: Date.now(),
      });
    });

    socket.on('chat:typing', (payload = {}) => {
      const roomId = String(payload.roomId || socket.data.roomId || '').trim();
      if (!roomId) return;
      socket.to(roomId).emit('chat:typing', {
        roomId,
        sender: String(payload.sender || socket.data.agentName || socket.data.userName || 'משתמש'),
      });
    });

    socket.on('chat:close-room', (payload = {}) => {
      const roomId = String(payload.roomId || socket.data.roomId || '').trim();
      if (!roomId) return;
      waitingRooms.delete(roomId);
      activeRooms.delete(roomId);
      io.to(roomId).emit('chat:closed', { roomId });
      broadcastWaitingRooms();
    });
  });
}
