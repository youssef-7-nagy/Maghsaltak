import { useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';

const SOCKET_URL = API_BASE_URL;

// socket.io-client is loaded via CDN in index.html as window.io
// This avoids any npm install issues while being functionally identical.

let socketInstance = null;

function getSocket() {
  if (typeof window === 'undefined' || !window.io) {
    return null;
  }

  // Strict singleton — do not re-create if disconnected, Socket.IO handles reconnection automatically
  if (!socketInstance) {
    try {
      socketInstance = window.io(SOCKET_URL, {
        transports: ['polling', 'websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
        reconnectionDelayMax: 10000,
        timeout: 10000,
      });

      socketInstance.on('connect_error', (err) => {
        // Log softly so it doesn't flood console with fatal red errors
        console.warn('[Socket.io] Realtime connection fallback:', err.message);
      });
    } catch (e) {
      console.warn('[Socket.io] Initialization error:', e.message);
    }
  }

  return socketInstance;
}

/**
 * useSocket — shared socket hook using CDN window.io.
 * Returns emit and on helpers backed by the singleton socket.
 */
export function useSocket() {
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socketRef.current = socket;

    return () => {
      // Do NOT disconnect — socket is shared across components
    };
  }, []);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  return { socket: socketRef, emit, on };
}

export default getSocket;
