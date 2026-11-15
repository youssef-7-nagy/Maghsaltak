import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import './AdminSupportChat.css';
import { useSocket } from '../hooks/useSocket';
import { API_BASE_URL } from '../config/api';

const API = API_BASE_URL;

function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
}

export default function AdminSupportChat() {
  const { socket } = useSocket();

  const [conversations,  setConversations]  = useState([]);
  const [selected,       setSelected]       = useState(null); 
  const [messages,       setMessages]       = useState([]);
  const [inputText,      setInputText]      = useState('');
  const [loading,        setLoading]        = useState(false);
  const [sending,        setSending]        = useState(false);
  const [searchTerm,     setSearchTerm]     = useState('');
  
  // Real-time features
  const [typingUsers,    setTypingUsers]    = useState({});

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const selectedRef    = useRef(null); 
  const typingTimeoutRef = useRef(null);

  const adminUser  = getStoredUser();
  const senderId   = adminUser?._id || adminUser?.id || '';
  const senderName = adminUser?.name || 'Support Team';

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getInitials = (name = '') =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const getUserAvatar = (user) => {
    if (user?.profilePhoto) {
      const p = user.profilePhoto;
      if (p.startsWith('http')) return p;
      if (p.startsWith('data:')) return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random`;
      return `${API}${p}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random`;
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  // ── Load conversations ─────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/support/admin/all`, { headers: getAuthHeader() });
      const convs = res.data?.data || [];
      // Initial sort by updatedAt
      convs.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      setConversations(convs);
    } catch (err) {
      console.error('AdminSupportChat: failed to load conversations', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ── Socket Events ──────────────────────────────────────────────────────────
  useEffect(() => {
    const sock = socket.current;
    if (!sock) return;

    const onConnect = () => sock.emit('join_support_admin');
    if (sock.connected) onConnect();
    sock.on('connect', onConnect);

    const onNewUserMessage = (msg) => {
      setConversations((prev) => {
        let convExists = false;
        let updated = prev.map((c) => {
          if (c._id !== msg.conversationId) return c;
          convExists = true;
          const isCurrentlyViewing = selectedRef.current?._id === msg.conversationId;
          return {
            ...c,
            messages: [...(c.messages || []), msg],
            unreadByAdmin: isCurrentlyViewing ? 0 : (c.unreadByAdmin || 0) + 1,
            updatedAt: new Date().toISOString() // update timestamp for sorting
          };
        });
        
        // If conversation is completely new and not in list, fetch it or append a stub
        if (!convExists) {
          loadConversations();
          return prev;
        }

        // Reorder conversations so the one with the new message goes to the top
        return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    };

    const onMsg = (msg) => {
      if (selectedRef.current && msg.conversationId === selectedRef.current._id) {
        setMessages((prev) => {
          if (msg._id && prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        
        // If it was our own message (admin), update the preview in the list and reorder
        if (msg.senderRole === 'admin') {
          setConversations((prev) => {
            const updated = prev.map(c => 
              c._id === msg.conversationId 
                ? { ...c, messages: [...(c.messages || []), msg], updatedAt: new Date().toISOString() } 
                : c
            );
            return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
          });
        }
      }
    };

    const onTyping = (data) => {
      const { conversationId, isTyping } = data;
      setTypingUsers(prev => ({ ...prev, [conversationId]: isTyping }));
    };

    sock.on('support_new_user_message', onNewUserMessage);
    sock.on('support_message', onMsg);
    sock.on('support_typing', onTyping);

    return () => {
      sock.off('connect', onConnect);
      sock.off('support_new_user_message', onNewUserMessage);
      sock.off('support_message', onMsg);
      sock.off('support_typing', onTyping);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, loadConversations]);

  // ── Open a conversation ────────────────────────────────────────────────────
  const openConversation = useCallback(async (conv) => {
    setSelected(conv);
    setMessages([]);

    setConversations((prev) =>
      prev.map((c) => c._id === conv._id ? { ...c, unreadByAdmin: 0 } : c)
    );

    try {
      const res = await axios.get(`${API}/support/admin/${conv._id}`, { headers: getAuthHeader() });
      setMessages(res.data?.data?.messages || []);
      axios.put(`${API}/support/admin/${conv._id}/read`, {}, { headers: getAuthHeader() }).catch(() => {});
      const sock = socket.current;
      if (sock?.connected) sock.emit('join_support_room', conv._id);
    } catch (err) {
      console.error('AdminSupportChat: failed to load messages', err);
    }

    setTimeout(() => {
      scrollToBottom();
      inputRef.current?.focus();
    }, 100);
  }, [socket, scrollToBottom]);

  // ── Send a reply ───────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || !selected || sending) return;
    setSending(true);
    const sock = socket.current;
    if (sock?.connected) {
      sock.emit('support_message', {
        conversationId: selected._id,
        senderId,
        senderName,
        senderRole: 'admin',
        text,
      });
      // Clear typing indicator instantly
      sock.emit('support_typing', { conversationId: selected._id, isTyping: false });
    }
    setInputText('');
    setTimeout(() => setSending(false), 400);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [inputText, selected, sending, senderId, senderName, socket]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    
    // Typing indicator logic
    const sock = socket.current;
    if (sock?.connected && selected) {
      sock.emit('support_typing', { conversationId: selected._id, isTyping: true });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sock.emit('support_typing', { conversationId: selected._id, isTyping: false });
      }, 2000);
    }
  };

  const [isOpen, setIsOpen] = useState(false);

  // ── Filtered conversations ──────────────────────────────────────────────────
  const filteredConversations = useMemo(() => {
    if (!searchTerm) return conversations;
    return conversations.filter(c => 
      c.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [conversations, searchTerm]);

  const totalUnread = useMemo(() => conversations.reduce((acc, c) => acc + (c.unreadByAdmin || 0), 0), [conversations]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Toggle Button */}
      <button className="asc-toggle-btn" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? 'Close Inbox' : 'Admin Inbox'}
        {!isOpen && totalUnread > 0 && <span className="asc-unread-total">{totalUnread}</span>}
      </button>

      {/* Floating Panel */}
      <div className={`wa-admin-container wa-admin-popup ${isOpen ? 'open' : ''}`}>
        {/* SIDEBAR */}
        <div className="wa-sidebar">
          <div className="wa-sidebar-header">
            <div className="wa-avatar" style={{ background: '#00a884' }}>
              {getInitials(senderName)}
            </div>
            <div style={{fontWeight: 'bold', color: '#111b21'}}>Support Inbox</div>
          </div>
          
          <div className="wa-search-bar">
            <div className="wa-search-input-wrapper">
              <span className="wa-search-icon">🔍</span>
              <input 
                type="text" 
                placeholder="Search or start new chat" 
                className="wa-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="wa-conv-list">
            {loading ? (
              <div className="wa-empty-state">Loading chats...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="wa-empty-state">No conversations found</div>
            ) : (
              filteredConversations.map((conv) => {
                const lastMsg = conv.messages?.[conv.messages.length - 1];
                const unread = conv.unreadByAdmin || 0;
                const isSelected = selected?._id === conv._id;
                const isTyping = typingUsers[conv._id];
                
                return (
                  <div 
                    key={conv._id} 
                    className={`wa-conv-item ${isSelected ? 'wa-conv-item--active' : ''}`}
                    onClick={() => openConversation(conv)}
                  >
                    <div className="wa-avatar-wrap">
                    <div className="wa-avatar" style={{ background: '#cfd8dc', color: '#fff', overflow: 'hidden' }}>
                      {getUserAvatar(conv.user) ? (
                        <img src={getUserAvatar(conv.user)} alt="avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} onError={(e) => e.target.style.display = 'none'} />
                      ) : (
                        getInitials(conv.userName)
                      )}
                    </div>
                    {conv.status === 'open' && <div className="wa-online-dot"></div>}
                  </div>
                    
                    <div className="wa-conv-info">
                      <div className="wa-conv-header">
                        <span className="wa-conv-name">{conv.userName}</span>
                        {lastMsg && (
                          <span className={`wa-conv-time ${unread > 0 ? 'wa-conv-time--unread' : ''}`}>
                            {formatTime(lastMsg.sentAt)}
                          </span>
                        )}
                      </div>
                      <div className="wa-conv-preview-row">
                        <span className={`wa-conv-preview ${unread > 0 ? 'wa-conv-preview--unread' : ''}`}>
                          {isTyping ? (
                            <span style={{color: '#00a884', fontWeight: '500'}}>typing...</span>
                          ) : lastMsg ? (
                            <>
                              {lastMsg.senderRole === 'admin' && <span className="wa-msg-ticks">✓✓ </span>}
                              {lastMsg.text}
                            </>
                          ) : 'No messages yet'}
                        </span>
                        {unread > 0 && <span className="wa-unread-badge">{unread}</span>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CHAT AREA */}
        <div className="wa-chat-area">
          {selected ? (
            <>
              <div className="wa-chat-header">
                <div className="wa-avatar" style={{ background: '#cfd8dc', color: '#fff', overflow: 'hidden' }}>
                  {getUserAvatar(selected.user) ? (
                    <img src={getUserAvatar(selected.user)} alt="avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} onError={(e) => e.target.style.display = 'none'} />
                  ) : (
                    getInitials(selected.userName)
                  )}
                </div>
                <div className="wa-chat-header-info">
                  <div className="wa-chat-name">{selected.userName}</div>
                  <div className="wa-chat-status">
                    {typingUsers[selected._id] ? 'typing...' : selected.userEmail}
                  </div>
                </div>
              </div>

              <div className="wa-messages-bg">
                <div className="wa-messages-container">
                  {messages.length === 0 ? (
                    <div className="wa-empty-messages">Start of conversation</div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isAdmin = msg.senderRole === 'admin';
                      return (
                        <div key={msg._id || idx} className={`wa-msg-row ${isAdmin ? 'wa-msg-row--mine' : ''}`}>
                          <div className={`wa-msg-bubble ${isAdmin ? 'wa-msg-bubble--mine' : ''}`}>
                            <div className="wa-msg-text">{msg.text}</div>
                            <div className="wa-msg-meta">
                              {formatTime(msg.sentAt)}
                              {isAdmin && <span className="wa-msg-ticks">✓✓</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {selected.status === 'open' ? (
                <div className="wa-input-area">
                  <input
                    ref={inputRef}
                    className="wa-input"
                    type="text"
                    placeholder="Type a message"
                    value={inputText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    disabled={sending}
                  />
                  <button
                    className="wa-send-btn"
                    onClick={handleSend}
                    disabled={!inputText.trim() || sending}
                  >
                    ➤
                  </button>
                </div>
              ) : (
                <div className="wa-closed-notice">This conversation is closed.</div>
              )}
            </>
          ) : (
            <div className="wa-no-chat-selected">
              <div className="wa-no-chat-icon">💬</div>
              <h2>WhatsApp Web</h2>
              <p>Select a conversation from the left to start messaging.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
