import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import './ChatBox.css';
import { useSocket } from '../hooks/useSocket';
import cleannnImg from '../assets/cleannn.png';
import { API_BASE_URL } from '../config/api';

const API = API_BASE_URL;

function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
}


export default function ChatBox({ bookingId, senderRole, workerName, collapsed: initialCollapsed = false }) {
  const { socket } = useSocket();
  const [messages,    setMessages]    = useState([]);
  const [inputText,   setInputText]   = useState('');
  const [isOpen,      setIsOpen]      = useState(!initialCollapsed);
  const [loading,     setLoading]     = useState(true);
  const [sending,     setSending]     = useState(false);
  const [unread,      setUnread]      = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  const user = getStoredUser();
  const senderId   = user?._id || user?.id || '';
  const senderName = user?.name || (senderRole === 'serviceProvider' ? 'Worker' : 'Customer');

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen, scrollToBottom]);

  // ── Fetch history on mount ────────────────────────────────────────────────
  useEffect(() => {
    if (!bookingId) return;
    setLoading(true);
    axios.get(`${API}/reservation/${bookingId}/messages`, { headers: getAuthHeader() })
      .then((res) => setMessages(res.data?.data || []))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [bookingId]);

  // ── Listen for incoming socket messages ───────────────────────────────────
  useEffect(() => {
    if (!bookingId) return;
    const sock = socket.current;
    if (!sock) return;

    // Make sure we are in the booking room
    if (sock.connected) sock.emit('join_booking_room', bookingId);
    sock.on('connect', () => sock.emit('join_booking_room', bookingId));

    const onMessage = (msg) => {
      if (msg.bookingId !== bookingId) return;
      setMessages((prev) => {
        // Deduplicate by id if available
        if (msg._id && prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      if (!isOpen) setUnread((n) => n + 1);
    };

    sock.on('chat_message', onMessage);
    return () => sock.off('chat_message', onMessage);
  }, [bookingId, socket, isOpen]);

  // ── Reset unread when opening ─────────────────────────────────────────────
  const handleOpen = () => {
    setIsOpen(true);
    setUnread(0);
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  // ── Send a message ────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || !senderId || sending) return;

    setSending(true);
    const sock = socket.current;
    if (sock?.connected) {
      sock.emit('chat_message', { bookingId, senderId, senderName, senderRole, text });
    }
    setInputText('');
    setSending(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [inputText, senderId, senderName, senderRole, bookingId, socket, sending]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const isMyMessage = (msg) => {
    const msgSender = msg.senderId?.toString?.() || msg.senderId;
    return msgSender === senderId || msg.senderRole === senderRole;
  };

  const otherName = senderRole === 'user'
    ? (workerName || 'Worker')
    : 'Customer';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`chatbox-wrapper ${isOpen ? 'chatbox-wrapper--open' : ''}`}>
      {/* Toggle bubble */}
      {!isOpen && (
        <button className="chatbox-toggle" onClick={handleOpen} aria-label="Open chat">
          <span className="chatbox-toggle__icon" style={senderRole === 'user' ? { display: 'flex', alignItems: 'center' } : {}}>
            {senderRole === 'user' ? (
              <img src={cleannnImg} alt="Worker Icon" style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              '💬'
            )}
          </span>
          <span className="chatbox-toggle__label">
            {senderRole === 'user' ? 'Contact with your worker' : `WhatsApp ${otherName}`}
          </span>
          {unread > 0 && (
            <span className="chatbox-toggle__badge">{unread}</span>
          )}
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="chatbox">
          {/* Header */}
          <div className="chatbox__header">
            <div className="chatbox__header-left">
              <div className="chatbox__avatar">{otherName[0]}</div>
              <div>
                <div className="chatbox__header-name">{otherName}</div>
                <div className="chatbox__header-sub">
                  <span className="chatbox__live-dot" />
                  Live Chat
                </div>
              </div>
            </div>
            <button className="chatbox__close" onClick={() => setIsOpen(false)} aria-label="Close chat">✕</button>
          </div>

          {/* Messages */}
          <div className="chatbox__messages">
            {loading ? (
              <div className="chatbox__loading">
                <div className="chatbox__spinner" />
                <span>Loading messages...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="chatbox__empty">
                <div className="chatbox__empty-icon">💬</div>
                <p>No messages yet.</p>
                <p className="chatbox__empty-sub">
                  {senderRole === 'user'
                    ? 'Send a message to your worker — e.g. parking spot or gate code.'
                    : 'You can message the client here about parking or any details.'}
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const mine = isMyMessage(msg);
                return (
                  <div
                    key={msg._id || idx}
                    className={`chatbox__message ${mine ? 'chatbox__message--mine' : 'chatbox__message--theirs'}`}
                  >
                    {!mine && (
                      <div className="chatbox__message-sender">{msg.senderName}</div>
                    )}
                    <div className="chatbox__bubble">
                      {msg.text}
                      <div className="chatbox__message-time">
                        {formatTime(msg.sentAt)}
                        {mine && <span className="chatbox__msg-ticks"> ✓✓</span>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chatbox__input-area">
            <input
              ref={inputRef}
              className="chatbox__input"
              type="text"
              placeholder="Type a message... (Enter to send)"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={500}
              disabled={sending}
            />
            <button
              className="chatbox__send"
              onClick={handleSend}
              disabled={!inputText.trim() || sending}
              aria-label="Send message"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
