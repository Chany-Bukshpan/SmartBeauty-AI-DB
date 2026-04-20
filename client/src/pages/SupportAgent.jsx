import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { chatSocket } from '../lib/chatSocket';
import './SupportChat.css';

export default function SupportAgent() {
  const [agentName, setAgentName] = useState('נציג');
  const [joinedLobby, setJoinedLobby] = useState(false);
  const [waitingRooms, setWaitingRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const canSend = useMemo(() => Boolean(activeRoomId && input.trim()), [activeRoomId, input]);

  useEffect(() => {
    const onWaiting = (rooms) => setWaitingRooms(Array.isArray(rooms) ? rooms : []);
    const onMessage = (payload) => {
      if (!payload?.roomId || payload.roomId !== activeRoomId) return;
      setMessages((prev) => [...prev, payload]);
    };
    const onClosed = (payload) => {
      if (payload?.roomId !== activeRoomId) return;
      setMessages((prev) => [...prev, { sender: 'system', text: 'השיחה נסגרה.' }]);
      setActiveRoomId('');
    };

    chatSocket.on('chat:waiting-rooms', onWaiting);
    chatSocket.on('chat:receive-message', onMessage);
    chatSocket.on('chat:closed', onClosed);
    return () => {
      chatSocket.off('chat:waiting-rooms', onWaiting);
      chatSocket.off('chat:receive-message', onMessage);
      chatSocket.off('chat:closed', onClosed);
    };
  }, [activeRoomId]);

  const joinLobby = () => {
    if (!agentName.trim()) return;
    chatSocket.emit('chat:agent-join-lobby', { agentName: agentName.trim() });
    setJoinedLobby(true);
  };

  const claimRoom = (roomId) => {
    chatSocket.emit('chat:agent-claim-room', { roomId, agentName: agentName.trim() || 'נציג' });
    setActiveRoomId(roomId);
    setMessages([{ sender: 'system', text: `שיחה פעילה: ${roomId}` }]);
  };

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !activeRoomId) return;
    chatSocket.emit('chat:message', { roomId: activeRoomId, text, sender: agentName.trim() || 'נציג' });
    setInput('');
  };

  return (
    <div className="support-chat-page">
      <div className="support-chat-head">
        <h1 className="section-title">פאנל נציג צ׳אט</h1>
        <p className="section-tagline">ניהול בקשות והתחברות לשיחות בזמן אמת</p>
      </div>

      <section className="support-chat-card">
        <header className="support-chat-header">
          <div>
            <h3>מרכז נציגים</h3>
            <p>{joinedLobby ? 'מחובר ללובי הנציגים' : 'נדרשת התחברות ללובי'}</p>
          </div>
        </header>

        {!joinedLobby ? (
          <div className="support-chat-empty">
            <input
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="שם נציג"
              style={{ maxWidth: 280 }}
            />
            <Button label="כניסה כלובי נציגים" onClick={joinLobby} />
          </div>
        ) : (
          <div className="agent-panel-layout">
            <aside className="agent-waiting">
              <h4>המתנה לטיפול</h4>
              {waitingRooms.length === 0 ? (
                <p className="section-tagline">אין פניות כרגע</p>
              ) : (
                waitingRooms.map((room) => (
                  <div key={room.roomId} className="agent-room-card">
                    <div>{room.userName || 'לקוח'}</div>
                    <small>{room.roomId}</small>
                    <Button label="קבל/י שיחה" className="p-button-sm" onClick={() => claimRoom(room.roomId)} />
                  </div>
                ))
              )}
            </aside>

            <div>
              <div className="support-chat-messages">
                {messages.map((m, i) => (
                  <div key={`${m.sender}-${i}`} className={`support-chat-msg ${
                    m.sender === 'system'
                      ? 'support-chat-msg--system'
                      : (m.sender === (agentName.trim() || 'נציג') ? 'support-chat-msg--user' : 'support-chat-msg--agent')
                  }`}>
                    {m.sender !== 'system' ? <strong>{m.sender}: </strong> : null}
                    {m.text}
                  </div>
                ))}
              </div>

              <div className="support-chat-input-row">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder={activeRoomId ? 'כתבי הודעה ללקוח...' : 'בחרי שיחה מהרשימה משמאל'}
                  disabled={!activeRoomId}
                />
                <Button label="שליחה" onClick={sendMessage} disabled={!canSend} />
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
