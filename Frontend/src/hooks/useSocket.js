import { useEffect, useRef, useCallback } from 'react';

const SOCKET_URL = 'http://localhost:8080';

// socket.io-client is loaded via CDN in index.html as window.io
// This avoids any npm install issues while being functionally identical.

let socketInstance = null;

function getSocket() {
  if (!window.io) {
    console.warn('[Socket] window.io not available yet — CDN script may still be loading');
    return null;
  }

  if (!socketInstance || socketInstance.disconnected) {
    socketInstance = window.io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
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

    if (!socket.connected) {
      socket.connect();
    }

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
