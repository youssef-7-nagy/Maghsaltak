import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import './SupportChat.css';
import { useSocket } from '../hooks/useSocket';
import supporter2Img from '../assets/supporter2.png';

const API = 'http://localhost:8080';

function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
}

/**
 * SupportChat — Global floating support chat widget.
 * Appears on every page for logged-in non-admin, non-SP users.
 * Admins handle replies via the Admin Panel → Support tab.
 */
export default function SupportChat() {
  const { socket } = useSocket();
  const [isOpen,       setIsOpen]       = useState(false);
  const [conversation, setConversation] = useState(null);  // { _id, messages[] }
  const [messages,     setMessages]     = useState([]);
  const [inputText,    setInputText]    = useState('');
  const [loading,      setLoading]      = useState(false);
  const [sending,      setSending]      = useState(false);
  const [unread,       setUnread]       = useState(0);

  const messagesEndRef  = useRef(null);
  const inputRef        = useRef(null);
  const initializedRef  = useRef(false);  // Use ref instead of state to avoid stale closure issues
  const conversationRef = useRef(null);   // Keep conversation in ref for socket callbacks

  const user       = getStoredUser();
  const senderId   = user?._id || user?.id || '';
  const senderName = user?.name || 'Customer';

  // ── Scroll to bottom ─────────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen, scrollToBottom]);

  // Keep conversationRef in sync
  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  // ── Load / create conversation (idempotent via ref guard) ─────────────────
  const initConversation = useCallback(async () => {
    if (initializedRef.current || loading) return;
    initializedRef.current = true; // set immediately to prevent double-calls
    setLoading(true);
    try {
      const res = await axios.get(`${API}/support/my`, { headers: getAuthHeader() });
      const conv = res.data?.data;
      setConversation(conv);
      setMessages(conv?.messages || []);

      // Join the socket room for this conversation
      const sock = socket.current;
      if (sock?.connected) {
        sock.emit('join_support_room', conv._id);
      }
    } catch (err) {
      console.error('SupportChat: failed to load conversation', err);
      initializedRef.current = false; // allow retry on error
    } finally {
      setLoading(false);
    }
  }, [loading, socket]);

  // ── Listen for incoming messages via socket ───────────────────────────────
  useEffect(() => {
    const sock = socket.current;
    if (!sock) return;

    const onSupportMessage = (msg) => {
      const currentConv = conversationRef.current;
      if (!currentConv || msg.conversationId !== currentConv._id) return;

      // Avoid duplicate messages
      setMessages((prev) => {
        if (msg._id && prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });

      // Show unread badge when chat is closed and admin replied
      if (!isOpen && msg.senderRole === 'admin') {
        setUnread((n) => n + 1);
      }
    };

    sock.on('support_message', onSupportMessage);
    return () => sock.off('support_message', onSupportMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, isOpen]);

  // ── Re-join room after reconnect ─────────────────────────────────────────
  useEffect(() => {
    const sock = socket.current;
    if (!sock) return;

    const onConnect = () => {
      const conv = conversationRef.current;
      if (conv?._id) sock.emit('join_support_room', conv._id);
    };
    sock.on('connect', onConnect);
    return () => sock.off('connect', onConnect);
  }, [socket]);

  // ── Open handler ─────────────────────────────────────────────────────────
  const handleOpen = async () => {
    setIsOpen(true);
    setUnread(0);
    await initConversation();
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = inputText.trim();
    const conv = conversationRef.current;
    if (!text || !senderId || !conv?._id || sending) return;

    setSending(true);
    const sock = socket.current;
    if (sock?.connected) {
      sock.emit('support_message', {
        conversationId: conv._id,
        senderId,
        senderName,
        senderRole: 'user',
        text,
      });
    } else {
      console.warn('SupportChat: socket not connected, message not sent');
    }
    setInputText('');
    
    // Slight debounce to prevent rapid double-clicks
    setTimeout(() => {
      setSending(false);
    }, 400);

    setTimeout(() => inputRef.current?.focus(), 50);
  }, [inputText, senderId, senderName, socket, sending]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const isMyMessage = (msg) => {
    const msgSenderId = msg.senderId?.toString?.() || msg.senderId;
    return msgSenderId === senderId || msg.senderRole === 'user';
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`support-wrapper ${isOpen ? 'support-wrapper--open' : ''}`}>
      {/* Toggle bubble */}
      {!isOpen && (
        <button className="support-toggle" onClick={handleOpen} aria-label="Open support chat">
          <span className="support-toggle__icon" style={{ display: 'flex', alignItems: 'center' }}>
            <img src={supporter2Img} alt="Support Icon" style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }} />
          </span>
          <span className="support-toggle__label">Support</span>
          {unread > 0 && (
            <span className="support-toggle__badge">{unread > 9 ? '9+' : unread}</span>
          )}
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div className="support-panel">
          {/* Header */}
          <div className="support-panel__header">
            <div className="support-panel__header-left">
              <div className="support-panel__logo">
                <img src={supporter2Img} alt="Support" className="support-header-icon" />
              </div>
              <div>
                <div className="support-panel__title">Maghsaltak Support</div>
                <div className="support-panel__sub">
                  <span className="support-panel__live-dot" />
                  online
                </div>
              </div>
            </div>
            <button className="support-panel__close" onClick={() => setIsOpen(false)} aria-label="Close">✕</button>
          </div>

          {/* Intro banner */}
          {messages.length === 0 && !loading && (
            <div className="support-intro">
              <div className="support-intro__emoji">👋</div>
              <p className="support-intro__title">Hi {senderName.split(' ')[0]}!</p>
              <p className="support-intro__sub">
                Got a question about your booking, payment, or anything else?
                Send us a message and our team will reply as soon as possible.
              </p>
            </div>
          )}

          {/* Messages */}
          <div className="support-messages">
            {loading ? (
              <div className="support-loading">
                <div className="support-spinner" />
                <span>Connecting...</span>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const mine = isMyMessage(msg);
                return (
                  <div
                    key={msg._id || idx}
                    className={`support-msg ${mine ? 'support-msg--mine' : 'support-msg--admin'}`}
                  >
                    <div className="support-msg__content">
                      <div className="support-msg__bubble">
                        {msg.text}
                        <div className="support-msg__time">
                          {formatTime(msg.sentAt)}
                          {mine && <span className="support-msg__ticks"> ✓✓</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="support-input-area">
            <input
              ref={inputRef}
              className="support-input"
              type="text"
              placeholder="Type a message"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={1000}
              disabled={sending || loading || !conversation}
            />
            <button
              className="support-send"
              onClick={handleSend}
              disabled={!inputText.trim() || sending || loading || !conversation}
              aria-label="Send"
            >
              ➤
            </button>
          </div>
          
          <div className="support-footer">🔒 End-to-end encrypted</div>
        </div>
      )}
    </div>
  );
}
