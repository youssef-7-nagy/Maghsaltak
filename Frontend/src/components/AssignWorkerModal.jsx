import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import './AssignWorkerModal.css';

const API = 'http://localhost:8080';

function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

function getInitials(name) {
  return (name || 'SP').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * AssignWorkerModal
 * Props:
 *  - booking: the BookWash document to assign
 *  - onClose: function to close modal
 *  - onAssigned: function(updatedBooking) called after successful assignment
 *  - isAccepting: boolean, if true, also accept the booking after assigning
 */
export default function AssignWorkerModal({ booking, onClose, onAssigned, isAccepting = true }) {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(booking?.assignedTo?._id || booking?.assignedTo || null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    loadProviders();
  }, []);

  async function loadProviders() {
    try {
      const res = await axios.get(`${API}/reservation/admin/service-providers`, {
        headers: getAuthHeader(),
      });
      setProviders(res.data.data || []);
    } catch {
      toast.error('Failed to load service providers');
    } finally {
      setLoading(false);
    }
  }

  async function handleAssign() {
    if (!selectedId) {
      toast.error('Please select a service provider');
      return;
    }

    setAssigning(true);
    try {
      // First assign the worker
      const assignRes = await axios.put(
        `${API}/reservation/${booking._id}/assign`,
        { serviceProviderId: selectedId },
        { headers: getAuthHeader() }
      );

      // If this is for accepting, also update status to accepted
      if (isAccepting) {
        const statusRes = await axios.put(
          `${API}/reservation/${booking._id}/status`,
          { status: 'accepted' },
          { headers: getAuthHeader() }
        );
        const updatedBooking = { ...assignRes.data.data, status: 'accepted' };
        toast.success('Booking accepted and worker assigned! 🎉');
        onAssigned?.(updatedBooking);
      } else {
        toast.success('Worker assigned successfully! 🎉');
        onAssigned?.(assignRes.data.data);
      }
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to assign worker');
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="assign-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="assign-modal">
        {/* Header */}
        <div className="assign-modal__header">
          <div className="assign-modal__header-left">
            <div className="assign-modal__header-icon">{isAccepting ? '✅' : '👷'}</div>
            <div>
              <div className="assign-modal__title">{isAccepting ? 'Accept Booking & Assign Worker' : 'Assign Worker'}</div>
              <div className="assign-modal__subtitle">
                {isAccepting ? 'Select a service provider and accept this booking' : 'Select a service provider for this booking'}
              </div>
            </div>
          </div>
          <button className="assign-modal__close" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="assign-modal__body">
          {/* Booking Summary */}
          <div className="assign-booking-summary">
            <div className="assign-summary-item">
              <span className="assign-summary-item__label">👤 Client</span>
              <span className="assign-summary-item__value">{booking?.userName || 'N/A'}</span>
            </div>
            <div className="assign-summary-item">
              <span className="assign-summary-item__label">📅 Date</span>
              <span className="assign-summary-item__value">{formatDate(booking?.date)}</span>
            </div>
            <div className="assign-summary-item">
              <span className="assign-summary-item__label">⏰ Time</span>
              <span className="assign-summary-item__value">{booking?.time || '—'}</span>
            </div>
            <div className="assign-summary-item">
              <span className="assign-summary-item__label">🧼 Service</span>
              <span className="assign-summary-item__value">{booking?.washPackage?.name || '—'}</span>
            </div>
          </div>

          {/* SP List */}
          <div className="assign-section-label">Available Service Providers</div>
          <div className="assign-sp-list">
            {loading ? (
              <div className="assign-loading">
                <div className="assign-spinner" />
                Loading providers...
              </div>
            ) : providers.length === 0 ? (
              <div className="assign-empty">
                No service providers found. Add a provider in the Users section first.
              </div>
            ) : (
              providers.map((sp) => (
                <div
                  key={sp._id}
                  className={`assign-sp-item ${selectedId === sp._id ? 'assign-sp-item--selected' : ''}`}
                  onClick={() => setSelectedId(sp._id)}
                >
                  <div className="assign-sp-item__avatar">
                    {sp.profilePhoto ? (
                      <img src={sp.profilePhoto.startsWith('http') ? sp.profilePhoto : sp.profilePhoto.startsWith('data:') ? undefined : `${API}${sp.profilePhoto}`} alt={sp.name} onError={(e) => e.target.style.display = 'none'} />
                    ) : (
                      getInitials(sp.name)
                    )}
                  </div>
                  <div className="assign-sp-item__info">
                    <div className="assign-sp-item__name">{sp.name}</div>
                    <div className="assign-sp-item__meta">
                      📞 {sp.phone || 'No phone'} &nbsp;·&nbsp; ✉️ {sp.email}
                    </div>
                  </div>
                  <div className={`assign-sp-item__available ${sp.isAvailable ? 'assign-sp-item__available--yes' : 'assign-sp-item__available--no'}`}>
                    <span>{sp.isAvailable ? '🟢' : '🔴'}</span>
                    <span>{sp.isAvailable ? 'Available' : 'Busy'}</span>
                  </div>
                  <div className="assign-sp-item__check">
                    {selectedId === sp._id && '✓'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="assign-modal__footer">
          <button className="assign-btn assign-btn--cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="assign-btn assign-btn--confirm"
            onClick={handleAssign}
            disabled={!selectedId || assigning}
          >
            {assigning ? 'Processing...' : (isAccepting ? '✅ Accept & Assign' : '👷 Assign Worker')}
          </button>
        </div>
      </div>
    </div>
  );
}
