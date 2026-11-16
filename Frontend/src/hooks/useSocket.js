import { useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';

const SOCKET_URL = API_BASE_URL;

let socketInstance = null;

function getSocket() {
  if (typeof window === 'undefined' || !window.io) {
    return null;
  }

  // Strict singleton — configure for serverless WebSocket transport
  if (!socketInstance) {
    try {
      socketInstance = window.io(SOCKET_URL, {
        // Vercel Serverless requires pure websocket transport.
        // Polling causes 400 Bad Request because serverless instances do not share session IDs.
        transports: ['websocket'],
        upgrade: false,
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 5000,
        reconnectionDelayMax: 15000,
        timeout: 10000,
      });

      socketInstance.on('connect_error', () => {
        // Quietly absorb connection errors without crashing or flooding console
      });
    } catch (e) {
      // Quietly absorb initialization errors
    }
  }

  return socketInstance;
}

/**
 * useSocket — shared socket hook with lazy on-demand connection.
 * @param {boolean} options.autoConnect - only establish connection when component needs it (e.g., chat is open).
 */
export function useSocket({ autoConnect = false } = {}) {
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socketRef.current = socket;

    if (autoConnect && !socket.connected) {
      try {
        socket.connect();
      } catch (e) {
        // absorb
      }
    }

    return () => {
      // Do NOT disconnect — socket is shared across components
    };
  }, [autoConnect]);

  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      try {
        socketRef.current.emit(event, data);
      } catch (e) {}
    }
  }, []);

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  return { socket: socketRef, emit, on };
}

export default getSocket;
