import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import './ServiceProviderDashboard.css';
import { useServiceProviderSocket } from '../hooks/useBookingTracking';
import ChatBox from '../components/ChatBox';
import washerImg from '../assets/washer.png';
import { API_BASE_URL } from '../config/api';

const API = API_BASE_URL;

const STATUS_FLOW = [
  { key: 'accepted', label: 'Accepted', icon: '✓', next: 'on_the_way' },
  { key: 'on_the_way', label: 'On the Way', icon: '🚗', next: 'arrived' },
  { key: 'arrived', label: 'Arrived', icon: '📍', next: 'washing' },
  { key: 'washing', label: 'Washing', icon: '🫧', next: 'finished' },
  { key: 'finished', label: 'Finished', icon: '🏁', next: null },
];

const STATUS_INFO = {
  unassigned: { label: 'Pending Acceptance', color: 'badge-warning', icon: '⏳' },
  accepted: { label: 'Accepted', color: 'badge-primary', icon: '✓' },
  on_the_way: { label: 'On the Way', color: 'badge-info', icon: '🚗' },
  arrived: { label: 'Arrived', color: 'badge-info', icon: '📍' },
  washing: { label: 'Washing', color: 'badge-primary', icon: '🫧' },
  finished: { label: 'Completed', color: 'badge-success', icon: '🏁' },
};

function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
}

function getInitials(name) {
  return (name || 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

// ── Image Upload System ───────────────────────────────────────────────────────
function ImageUploadPanel({ bookingId, existingBefore = [], existingAfter = [], onUploaded }) {
  const [activeTab, setActiveTab] = useState('before');
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    setSelectedFiles(prev => [...prev, ...files]);
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...urls]);
    e.target.value = null; // reset input
  }

  function handleRemovePreview(index) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  }

  async function handleUpload() {
    if (!selectedFiles.length) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('imageType', activeTab);
    selectedFiles.forEach((f) => formData.append('images', f));

    try {
      const res = await axios.post(
        `${API}/service-provider/bookings/${bookingId}/images`,
        formData,
        { headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' } }
      );
      toast.success(`${activeTab === 'before' ? 'Before' : 'After'} images uploaded!`);
      setSelectedFiles([]);
      setPreviewUrls([]);
      onUploaded?.(res.data.data);
    } catch (err) {
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  const currentExisting = activeTab === 'before' ? existingBefore : existingAfter;

  return (
    <div className="sp-card sp-upload-section">
      <div className="sp-card-header">
        <h3>📸 Before & After Photos</h3>
      </div>
      
      <div className="sp-tabs sp-tabs--small">
        <button
          className={`sp-tab ${activeTab === 'before' ? 'active' : ''}`}
          onClick={() => { setActiveTab('before'); setSelectedFiles([]); setPreviewUrls([]); }}
        >
          Before Wash
        </button>
        <button
          className={`sp-tab ${activeTab === 'after' ? 'active' : ''}`}
          onClick={() => { setActiveTab('after'); setSelectedFiles([]); setPreviewUrls([]); }}
        >
          After Wash
        </button>
      </div>

      <div className="sp-upload-area">
        <input
          type="file"
          id={`upload-${activeTab}`}
          accept="image/*"
          capture="environment"
          multiple
          disabled={uploading}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <label htmlFor={`upload-${activeTab}`} className="sp-upload-dropzone">
          <span className="upload-icon">📷</span>
          <span className="upload-text">Tap to take or select photos</span>
        </label>
      </div>

      {previewUrls.length > 0 && (
        <div className="sp-preview-container">
          <h4>Ready to upload:</h4>
          <div className="sp-image-grid">
            {previewUrls.map((url, i) => (
              <div key={i} className="sp-image-item sp-image-item--preview">
                <img src={url} alt={`Preview ${i + 1}`} />
                <button className="remove-preview-btn" onClick={() => handleRemovePreview(i)}>✕</button>
              </div>
            ))}
          </div>
          <button 
            className="btn-primary btn-upload" 
            onClick={handleUpload} 
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} Photos`}
          </button>
        </div>
      )}

      {currentExisting.length > 0 && (
        <div className="sp-existing-images">
          <h4>Uploaded {activeTab} images:</h4>
          <div className="sp-image-grid">
            {currentExisting.map((url, i) => {
              let fullUrl = url.replace('http://localhost:3000', API);
              fullUrl = fullUrl.startsWith('http') || fullUrl.startsWith('data:')
                ? fullUrl
                : fullUrl.startsWith('/') ? `${API}${fullUrl}` : `${API}/uploads/${fullUrl}`;
              return (
                <div key={i} className="sp-image-item">
                  <img src={fullUrl} alt={`Uploaded ${activeTab} ${i + 1}`} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Status Update Steps ───────────────────────────────────────────────────────
function StatusUpdatePanel({ booking, onStatusUpdated }) {
  const [loading, setLoading] = useState(false);
  const currentStatus = booking?.workerStatus || 'unassigned';

  async function updateStatus(newStatus) {
    setLoading(true);
    try {
      let endpoint = `${API}/service-provider/bookings/${booking._id}/status`;
      let method = 'put';

      if (currentStatus === 'unassigned' && newStatus === 'accepted') {
        endpoint = `${API}/service-provider/bookings/${booking._id}/accept`;
        const res = await axios[method](endpoint, {}, { headers: getAuthHeader() });
        onStatusUpdated?.(res.data.data);
        toast.success('Booking accepted! 🎉');
        return;
      }

      const res = await axios.put(endpoint, { workerStatus: newStatus }, { headers: getAuthHeader() });
      onStatusUpdated?.(res.data.data);
      toast.success(`Status updated to ${STATUS_INFO[newStatus]?.label || newStatus}`);
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  }

  const nextStatus = currentStatus === 'unassigned'
    ? 'accepted'
    : STATUS_FLOW.find((s) => s.key === currentStatus)?.next;

  return (
    <div className="sp-card sp-status-panel">
      <div className="sp-card-header">
        <h3>Update Order Progress</h3>
      </div>
      <div className="sp-timeline">
        {[{ key: 'accepted', label: 'Accept', icon: '✓' },
          { key: 'on_the_way', label: 'On Way', icon: '🚗' },
          { key: 'arrived', label: 'Arrived', icon: '📍' },
          { key: 'washing', label: 'Washing', icon: '🫧' },
          { key: 'finished', label: 'Finish', icon: '🏁' },
        ].map((step) => {
          const stepIdx = STATUS_FLOW.findIndex((s) => s.key === step.key);
          const currentIdx = STATUS_FLOW.findIndex((s) => s.key === currentStatus);
          const isActive = step.key === currentStatus;
          const isPast = stepIdx < currentIdx;
          const isNext = step.key === nextStatus || (currentStatus === 'unassigned' && step.key === 'accepted');
          const clickable = isNext && !loading;

          let stateClass = 'pending';
          if (isActive) stateClass = 'active';
          if (isPast) stateClass = 'done';
          if (isNext) stateClass = 'next';

          return (
            <button
              key={step.key}
              className={`timeline-node timeline-node--${stateClass}`}
              disabled={!clickable}
              onClick={() => clickable && updateStatus(step.key)}
            >
              <div className="timeline-icon">{step.icon}</div>
              <div className="timeline-label">{step.label}</div>
              {isNext && !isActive && <div className="timeline-hint">Tap Next</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Booking Detail Modal ───────────────────────────────────────────────────────
function BookingDetailModal({ booking, onClose, onUpdate }) {
  const [localBooking, setLocalBooking] = useState(booking);

  function handleStatusUpdated(updated) {
    setLocalBooking(updated);
    onUpdate?.(updated);
  }

  function handleUploaded(data) {
    setLocalBooking((prev) => ({
      ...prev,
      beforeImages: data.imageType === 'before' ? [...(prev.beforeImages || []), ...data.images] : prev.beforeImages,
      afterImages: data.imageType === 'after' ? [...(prev.afterImages || []), ...data.images] : prev.afterImages,
    }));
    onUpdate?.(localBooking);
  }

  const client = localBooking?.user;
  const status = localBooking?.workerStatus || 'unassigned';
  const statusInfo = STATUS_INFO[status] || STATUS_INFO.unassigned;
  const isFinished = status === 'finished';

  return (
    <div className="sp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sp-modal">
        <div className="sp-modal-header">
          <div className="header-info">
            <h2>Order Details</h2>
            <span className="order-id">#{localBooking?._id?.slice(-8).toUpperCase()}</span>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="sp-modal-body">
          {/* Client Profile Card */}
          <div className="sp-card client-card">
            <div className="client-avatar">
              {client?.profilePhoto
                ? <img src={client.profilePhoto.startsWith('http') ? client.profilePhoto : client.profilePhoto.startsWith('data:') ? undefined : `${API}${client.profilePhoto}`} alt={client.name} onError={(e) => e.target.style.display = 'none'} />
                : getInitials(client?.name)}
            </div>
            <div className="client-info">
              <h3>{client?.name || 'Client'}</h3>
              <p>📞 {client?.phone || localBooking?.userPhone || 'N/A'}</p>
              <p>✉️ {client?.email || localBooking?.userEmail || 'N/A'}</p>
            </div>
            <div className="client-badge">
              <span className={`sp-badge ${statusInfo.color}`}>
                {statusInfo.icon} {statusInfo.label}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="sp-details-grid">
            <div className="detail-item">
              <span className="label">🚗 Vehicle</span>
              <strong className="value">{localBooking?.vehicle?.label || localBooking?.vehicle?.type || 'N/A'}</strong>
            </div>
            <div className="detail-item">
              <span className="label">🧼 Wash Type</span>
              <strong className="value">{localBooking?.washPackage?.name || 'N/A'}</strong>
            </div>
            <div className="detail-item">
              <span className="label">📅 Date & Time</span>
              <strong className="value">{formatDate(localBooking?.date)} at {localBooking?.time || 'N/A'}</strong>
            </div>
            <div className="detail-item">
              <span className="label">💰 Payment</span>
              <strong className="value">
                {localBooking?.washPackage?.price ? `$${localBooking.washPackage.price}` : 'N/A'} 
                <span className="payment-type">({localBooking?.paymentMethod?.toUpperCase() || 'CASH'})</span>
              </strong>
            </div>
          </div>

          {/* Location */}
          <div className="sp-card location-card">
            <span className="location-icon">📍</span>
            <div>
              <span className="label">Address / Location</span>
              <strong className="value">{localBooking?.location || 'N/A'}</strong>
            </div>
          </div>

          {/* Notes */}
          {localBooking?.notes && (
            <div className="sp-card notes-card">
              <span className="label">📝 Customer Notes</span>
              <p className="value">{localBooking.notes}</p>
            </div>
          )}

          {/* Action / Progress Area */}
          {!isFinished && (
            <StatusUpdatePanel booking={localBooking} onStatusUpdated={handleStatusUpdated} />
          )}

          {/* Image Upload Area */}
          {(status !== 'unassigned') && (
            <ImageUploadPanel
              bookingId={localBooking?._id}
              existingBefore={localBooking?.beforeImages || []}
              existingAfter={localBooking?.afterImages || []}
              onUploaded={handleUploaded}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Booking Card ──────────────────────────────────────────────────────────────
function BookingCard({ booking, onClick }) {
  const status = booking?.workerStatus || 'unassigned';
  const statusInfo = STATUS_INFO[status] || STATUS_INFO.unassigned;
  const client = booking?.user;

  return (
    <div className="sp-card booking-card" onClick={onClick}>
      <div className="booking-card-header">
        <span className="booking-id">#{booking._id?.slice(-8).toUpperCase()}</span>
        <span className={`sp-badge ${statusInfo.color}`}>
          {statusInfo.icon} {statusInfo.label}
        </span>
      </div>

      <div className="booking-card-body">
        <div className="booking-client">
          <div className="client-avatar client-avatar--small">
            {client?.profilePhoto
              ? <img src={client.profilePhoto.startsWith('http') ? client.profilePhoto : client.profilePhoto.startsWith('data:') ? undefined : `${API}${client.profilePhoto}`} alt={client.name} onError={(e) => e.target.style.display = 'none'} />
              : getInitials(client?.name || booking.userName)}
          </div>
          <div>
            <h4 className="client-name">{client?.name || booking.userName || 'Client'}</h4>
            <p className="client-phone">📞 {client?.phone || booking.userPhone || 'N/A'}</p>
          </div>
        </div>

        <div className="booking-details-list">
          <div className="bd-row">
            <span>Vehicle</span>
            <strong>{booking.vehicle?.type || '—'}</strong>
          </div>
          <div className="bd-row">
            <span>Service</span>
            <strong>{booking.washPackage?.name || '—'}</strong>
          </div>
          <div className="bd-row">
            <span>Schedule</span>
            <strong>{formatDate(booking.date)} • {booking.time || '—'}</strong>
          </div>
        </div>

        <div className="booking-location">
          <span>📍</span>
          <p>{booking.location || 'No location provided'}</p>
        </div>
      </div>

      <div className="booking-card-footer">
        <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); onClick(); }}>
          Manage Order
        </button>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function ServiceProviderDashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [activeTab, setActiveTab] = useState('total'); // total, pending, active, completed
  const [searchQuery, setSearchQuery] = useState('');
  
  const userData = JSON.parse(localStorage.getItem('user') || 'null');
  const spId = userData?._id;

  const handleNewBooking = useCallback((booking) => {
    setBookings((prev) => {
      const exists = prev.some((b) => b._id === booking._id);
      if (exists) return prev;
      toast.success('🔔 New booking assigned to you!');
      return [booking, ...prev];
    });
  }, []);

  useServiceProviderSocket(spId, handleNewBooking);

  useEffect(() => {
    loadBookings();
    if (userData) {
      setIsAvailable(userData.isAvailable ?? true);
    }
  }, []);

  async function loadBookings() {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/service-provider/bookings`, {
        headers: getAuthHeader(),
      });
      setBookings(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }

  async function toggleAvailability() {
    setUpdatingAvailability(true);
    const newVal = !isAvailable;
    try {
      await axios.put(
        `${API}/service-provider/availability`,
        { isAvailable: newVal },
        { headers: getAuthHeader() }
      );
      setIsAvailable(newVal);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...user, isAvailable: newVal }));
      toast.success(newVal ? 'You are now online' : 'You are now offline');
    } catch {
      toast.error('Failed to update availability');
    } finally {
      setUpdatingAvailability(false);
    }
  }

  function handleBookingUpdated(updated) {
    setBookings((prev) => prev.map((b) => (b._id === updated._id ? { ...b, ...updated } : b)));
    if (selectedBooking?._id === updated._id) {
      setSelectedBooking((prev) => ({ ...prev, ...updated }));
    }
  }

  // Filter & Sort Logic
  const filteredBookings = (() => {
    let list = [];
    switch (activeTab) {
      case 'pending':
        list = bookings.filter(b => b.workerStatus === 'unassigned');
        list.sort((a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date)); // Oldest first
        break;
      case 'active':
        list = bookings.filter(b => ['accepted', 'on_the_way', 'arrived', 'washing'].includes(b.workerStatus));
        list.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)); // Newest first
        break;
      case 'completed':
        list = bookings.filter(b => b.workerStatus === 'finished');
        list.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)); // Newest first
        break;
      case 'total':
      default:
        list = [...bookings];
        list.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)); // Newest first
        break;
    }
    
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(b => {
        const clientName = (b.user?.name || b.userName || '').toLowerCase();
        const id = (b._id || '').toLowerCase();
        return clientName.includes(q) || id.includes(q);
      });
    }
    
    return list;
  })();

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.workerStatus === 'unassigned').length,
    active: bookings.filter((b) => ['accepted', 'on_the_way', 'arrived', 'washing'].includes(b.workerStatus)).length,
    completed: bookings.filter((b) => b.workerStatus === 'finished').length,
  };

  return (
    <div className="sp-dashboard">
      <div className="sp-dashboard-header">
        <div className="header-content">
          <div className="header-greeting">
            <img src={washerImg} alt="Washer" className="header-washer-icon" />
            <div className="header-text">
              <h1>Provider Dashboard</h1>
              <p>Welcome back, {userData?.name || 'Provider'}</p>
            </div>
          </div>
          <button
            className={`status-toggle ${isAvailable ? 'online' : 'offline'}`}
            onClick={toggleAvailability}
            disabled={updatingAvailability}
          >
            <span className="dot" />
            {updatingAvailability ? 'Updating...' : isAvailable ? 'Online' : 'Offline'}
          </button>
        </div>
      </div>

      <div className="sp-container">
        {/* Navigation Tabs & Search */}
        <div className="sp-dashboard-controls">
          <div className="sp-tabs-container">
            <button className={`sp-tab ${activeTab === 'total' ? 'active' : ''}`} onClick={() => setActiveTab('total')}>
              Total Assigned <span className="count">{stats.total}</span>
            </button>
            <button className={`sp-tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
              Pending Accepting <span className="count">{stats.pending}</span>
            </button>
            <button className={`sp-tab ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>
              Active Orders <span className="count">{stats.active}</span>
            </button>
            <button className={`sp-tab ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}>
              Completed Orders <span className="count">{stats.completed}</span>
            </button>
          </div>

          {/* User's Search Bar */}
          <div className="sp-search-wrapper">
            <div className="sp-search-container">
              <input 
                className="sp-search-input" 
                type="text" 
                placeholder="Search name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg viewBox="0 0 24 24" className="sp-search-icon">
                <g>
                  <path d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z"></path>
                </g>
              </svg>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="sp-grid">
          {loading ? (
            <div className="sp-loading-state">
              <div className="spinner"></div>
              <p>Loading your orders...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="sp-empty-state">
              <div className="empty-icon">📂</div>
              <h2>No {activeTab !== 'total' ? activeTab : ''} orders found</h2>
              <p>When you receive an assignment, it will appear here.</p>
            </div>
          ) : (
            filteredBookings.map((booking) => (
              <BookingCard
                key={booking._id}
                booking={booking}
                onClick={() => setSelectedBooking(booking)}
              />
            ))
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onUpdate={handleBookingUpdated}
        />
      )}

      {/* Live Chat */}
      {(() => {
        const activeBooking = bookings.find((b) =>
          ['accepted','on_the_way','arrived','washing'].includes(b.workerStatus)
        );
        if (!activeBooking) return null;
        return (
          <ChatBox
            key={activeBooking._id}
            bookingId={activeBooking._id}
            senderRole="serviceProvider"
            workerName={userData?.name || 'Worker'}
            collapsed={true}
          />
        );
      })()}
    </div>
  );
}
