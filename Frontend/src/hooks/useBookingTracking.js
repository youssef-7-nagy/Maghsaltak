import { useEffect, useState, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';

/**
 * useBookingTracking — hook for real-time booking status tracking.
 * Used by the client TrackingPage to listen to updates for a specific booking.
 *
 * @param {string} bookingId — The booking ID to track
 * @returns {{ workerStatus, workerLocation, estimatedArrival, images, isConnected, statusHistory }}
 */
export function useBookingTracking(bookingId) {
  const { socket, emit, on } = useSocket();
  const [isConnected, setIsConnected] = useState(false);
  const [workerStatus, setWorkerStatus] = useState(null);
  const [workerLocation, setWorkerLocation] = useState(null);
  const [estimatedArrival, setEstimatedArrival] = useState(null);
  const [images, setImages] = useState({ before: [], after: [] });
  const [statusHistory, setStatusHistory] = useState([]);

  const pushHistory = useCallback((status, ts) => {
    setStatusHistory((prev) => {
      if (prev.some((h) => h.status === status)) return prev;
      return [...prev, { status, time: ts || new Date().toISOString() }];
    });
  }, []);

  useEffect(() => {
    if (!bookingId) return;

    const sock = socket.current;
    if (!sock) return;

    const onConnect = () => {
      setIsConnected(true);
      // Join the booking room
      sock.emit('join_booking_room', bookingId);
    };

    const onDisconnect = () => setIsConnected(false);

    const onWorkerStatus = (data) => {
      if (data.bookingId !== bookingId) return;
      setWorkerStatus(data.workerStatus);
      if (data.estimatedArrival) setEstimatedArrival(data.estimatedArrival);
      pushHistory(data.workerStatus, data.startedAt || data.finishedAt || data.acceptedAt);
    };

    const onWorkerLocation = (data) => {
      if (data.bookingId !== bookingId) return;
      setWorkerLocation({ lat: data.lat, lng: data.lng, updatedAt: data.updatedAt });
    };

    const onImages = (data) => {
      if (data.bookingId !== bookingId) return;
      setImages((prev) => ({
        ...prev,
        [data.imageType]: [...(prev[data.imageType] || []), ...data.images],
      }));
    };

    if (sock.connected) onConnect();

    sock.on('connect', onConnect);
    sock.on('disconnect', onDisconnect);
    sock.on('worker_status_update', onWorkerStatus);
    sock.on('worker_location_update', onWorkerLocation);
    sock.on('wash_images_uploaded', onImages);

    return () => {
      sock.off('connect', onConnect);
      sock.off('disconnect', onDisconnect);
      sock.off('worker_status_update', onWorkerStatus);
      sock.off('worker_location_update', onWorkerLocation);
      sock.off('wash_images_uploaded', onImages);
    };
  }, [bookingId, socket, pushHistory]);

  return { workerStatus, workerLocation, estimatedArrival, images, isConnected, statusHistory };
}

/**
 * useServiceProviderSocket — hook for the service provider dashboard.
 * Joins the SP's personal room and listens for new booking assignments.
 *
 * @param {string} spId — the service provider's user ID
 * @param {Function} onNewBooking — callback called when a booking_assigned event arrives
 */
export function useServiceProviderSocket(spId, onNewBooking) {
  const { socket } = useSocket();
  const callbackRef = useRef(onNewBooking);
  callbackRef.current = onNewBooking;

  useEffect(() => {
    if (!spId) return;

    const sock = socket.current;
    if (!sock) return;

    const onConnect = () => {
      sock.emit('join_sp_room', spId);
    };

    const onAssigned = (data) => {
      callbackRef.current?.(data.booking);
    };

    if (sock.connected) onConnect();

    sock.on('connect', onConnect);
    sock.on('booking_assigned', onAssigned);

    return () => {
      sock.off('connect', onConnect);
      sock.off('booking_assigned', onAssigned);
    };
  }, [spId, socket]);
}
