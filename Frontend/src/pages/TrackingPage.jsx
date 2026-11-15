import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import './TrackingPage.css';
import { useBookingTracking } from '../hooks/useBookingTracking';
import ChatBox from '../components/ChatBox';
import { API_BASE_URL } from '../config/api';

const API = API_BASE_URL;

function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatTime(ts) {
  if (!ts) return null;
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ── Status Timeline definition ────────────────────────────────────────────────
const TIMELINE_STEPS = [
  { key: 'accepted',  icon: '✓', title: 'Worker Accepted',      desc: 'Worker has accepted your order' },
  { key: 'on_the_way',icon: '🚗', title: 'On the Way',           desc: 'Worker is heading to your location' },
  { key: 'arrived',   icon: '📍', title: 'Worker Arrived',       desc: 'Worker has arrived at your location' },
  { key: 'washing',   icon: '🫧', title: 'Washing in Progress',  desc: 'Your car is being washed' },
  { key: 'finished',  icon: '🏁', title: 'Completed',            desc: 'Car wash is complete!' },
];

const STATUS_ORDER = ['accepted', 'on_the_way', 'arrived', 'washing', 'finished'];

function getStepState(stepKey, currentStatus) {
  if (!currentStatus || currentStatus === 'unassigned') return 'pending';
  const stepIdx    = STATUS_ORDER.indexOf(stepKey);
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

const STATUS_LABELS = {
  unassigned: { icon: '⏳', text: 'Awaiting Worker',      sub: 'Waiting for worker confirmation.' },
  accepted:   { icon: '✓',  text: 'Worker Accepted',      sub: 'Worker will be on their way shortly.' },
  on_the_way: { icon: '🚗', text: 'On the Way',           sub: 'Worker is heading to your location.' },
  arrived:    { icon: '📍', text: 'Worker Arrived',       sub: 'Worker has arrived.' },
  washing:    { icon: '🫧', text: 'Washing in Progress',  sub: 'Your car is being washed!' },
  finished:   { icon: '🏁', text: 'Wash Complete!',       sub: 'Hope you love your clean car!' },
};

// ── Timeline Component ────────────────────────────────────────────────────────
function StatusTimeline({ currentStatus, statusHistory }) {
  function getTimestamp(stepKey) {
    const entry = statusHistory.find((h) => h.status === stepKey);
    return entry ? formatTime(entry.time) : null;
  }

  return (
    <div className="tracking-card">
      <div className="tracking-card-header">
        <h3>Live Status Updates</h3>
      </div>
      <div className="timeline-steps">
        {TIMELINE_STEPS.map((step) => {
          const state = getStepState(step.key, currentStatus);
          const ts    = getTimestamp(step.key);
          return (
            <div key={step.key} className={`timeline-step timeline-step--${state}`}>
              <div className="timeline-step__line" />
              <div className="timeline-step__icon-wrap">
                {state === 'done' ? '✓' : step.icon}
              </div>
              <div className="timeline-step__body">
                <div className="timeline-step__title">{step.title}</div>
                <div className="timeline-step__desc">{step.desc}</div>
                {ts && <div className="timeline-step__time">{ts}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Review Section Component ──────────────────────────────────────────────────
function ReviewSection({ bookingId, existingRating, existingReview, onReviewSubmitted }) {
  const [rating,      setRating]      = useState(existingRating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText,  setReviewText]  = useState(existingReview || '');
  const [submitting,  setSubmitting]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!rating) return toast.error('Please select a star rating first');
    setSubmitting(true);
    try {
      const res = await axios.post(
        `${API}/reservation/${bookingId}/review`,
        { rating, reviewText },
        { headers: getAuthHeader() }
      );
      toast.success('Thank you for your review!');
      onReviewSubmitted(res.data.data);
    } catch {
      toast.error('Failed to submit review');
      setSubmitting(false);
    }
  }

  return (
    <div className="tracking-card tracking-review-section">
      <div className="tracking-review-header">
        <h3>Rate Your Experience</h3>
        <p>How was your car wash? Your feedback helps us improve.</p>
      </div>

      {existingRating ? (
        <div className="tracking-review-success">
          <div className="tracking-review-stars tracking-review-stars--static">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className={star <= existingRating ? 'star-active' : 'star-inactive'}>
                ★
              </span>
            ))}
          </div>
          {existingReview && (
            <div className="tracking-review-text">"{existingReview}"</div>
          )}
          <div className="tracking-review-thanks">✓ Thank you for your feedback!</div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="tracking-review-form">
          <div className="tracking-review-stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={star <= (hoverRating || rating) ? 'star-active' : 'star-inactive'}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              >
                ★
              </span>
            ))}
          </div>

          <textarea
            className="tracking-review-input"
            placeholder="Tell us about your experience... (optional)"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            disabled={submitting}
          />

          <button
            type="submit"
            className="tracking-btn-primary tracking-review-btn"
            disabled={!rating || submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      )}
    </div>
  );
}

// ── Main Tracking Page ────────────────────────────────────────────────────────
export default function TrackingPage() {
  const { bookingId } = useParams();
  const navigate      = useNavigate();
  const [booking,   setBooking]  = useState(null);
  const [loading,   setLoading]  = useState(true);
  const [notFound,  setNotFound] = useState(false);
  const [photoTab,  setPhotoTab] = useState('before');

  const {
    workerStatus,
    estimatedArrival,
    images: realtimeImages,
    isConnected,
    statusHistory,
  } = useBookingTracking(bookingId);

  useEffect(() => {
    if (!bookingId) return;
    async function fetchBooking() {
      setLoading(true);
      try {
        const res  = await axios.get(`${API}/reservation/my`, { headers: getAuthHeader() });
        const all  = res.data?.data || [];
        const found = all.find((b) => b._id === bookingId);
        if (found) {
          setBooking(found);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchBooking();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="tracking-page tracking-page--center">
        <div className="tracking-spinner" />
        <p className="tracking-loading-text">Loading your order...</p>
      </div>
    );
  }

  if (notFound || !booking) {
    return (
      <div className="tracking-page tracking-page--center">
        <div className="tracking-notfound-icon">🔍</div>
        <h2>Order Not Found</h2>
        <p>We couldn't find this booking in your account.</p>
        <button className="tracking-btn-primary" onClick={() => navigate('/profile')}>
          Back to Profile
        </button>
      </div>
    );
  }

  const currentStatus = workerStatus || booking.workerStatus || 'unassigned';
  const eta           = estimatedArrival || booking.estimatedArrival;
  const statusInfo    = STATUS_LABELS[currentStatus] || STATUS_LABELS.unassigned;

  const beforeImages = [...(booking.beforeImages || []), ...(realtimeImages.before || [])];
  const afterImages  = [...(booking.afterImages  || []), ...(realtimeImages.after  || [])];
  const hasPhotos    = beforeImages.length > 0 || afterImages.length > 0;
  const currentPhotos = photoTab === 'before' ? beforeImages : afterImages;

  const combinedHistory = [
    booking.acceptedAt && { status: 'accepted', time: booking.acceptedAt },
    booking.startedAt  && { status: 'washing',  time: booking.startedAt  },
    booking.finishedAt && { status: 'finished', time: booking.finishedAt },
    ...statusHistory,
  ].filter(Boolean);

  const isFinished = currentStatus === 'finished';

  return (
    <div className="tracking-page">
      <div className="tracking-header">
        <button className="tracking-back-btn" onClick={() => navigate(-1)}>
          <span className="back-arrow">←</span> Back
        </button>
        <div className={`tracking-connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          <div className="connection-dot" />
          {isConnected ? 'Live' : 'Reconnecting...'}
        </div>
      </div>

      <div className="tracking-hero">
        <div className="tracking-hero__icon">{isFinished ? '✨' : '🚗'}</div>
        <h1 className="tracking-hero__title">
          {isFinished ? 'Review Your Service' : 'Live Order Tracking'}
        </h1>
        <div className="tracking-hero__id">Order #{bookingId?.slice(-8).toUpperCase()}</div>
      </div>

      <div className="tracking-content">
        <div className="tracking-main-col">
          {!isFinished ? (
            <StatusTimeline currentStatus={currentStatus} statusHistory={combinedHistory} />
          ) : (
            <ReviewSection
              bookingId={bookingId}
              existingRating={booking.rating}
              existingReview={booking.reviewText}
              onReviewSubmitted={(updated) =>
                setBooking({ ...booking, rating: updated.rating, reviewText: updated.reviewText })
              }
            />
          )}
        </div>

        <div className="tracking-side-col">
          {!isFinished && (
            <div className="tracking-card tracking-status-card">
              <div className="tracking-card-header">
                <h3>Current Status</h3>
              </div>
              <div className="tracking-live-status">
                <div className="tracking-live-status__icon">{statusInfo.icon}</div>
                <div className="tracking-live-status__content">
                  <h4>{statusInfo.text}</h4>
                  <p>{statusInfo.sub}</p>
                </div>
              </div>
            </div>
          )}

          {eta && currentStatus === 'on_the_way' && (
            <div className="tracking-card tracking-eta-card">
              <div className="tracking-card-header">
                <h3>Estimated Arrival</h3>
              </div>
              <div className="tracking-eta-time">{eta}</div>
            </div>
          )}

          <div className="tracking-card">
            <div className="tracking-card-header">
              <h3>Booking Details</h3>
            </div>
            <div className="tracking-details-list">
              <div className="tracking-detail-row">
                <span>Worker</span>
                <strong>{booking.assignedTo?.name || booking.workerName || 'Awaiting Assignment'}</strong>
              </div>
              <div className="tracking-detail-row">
                <span>Service</span>
                <strong>{booking.washPackage?.name || '—'}</strong>
              </div>
              <div className="tracking-detail-row">
                <span>Vehicle</span>
                <strong>{booking.vehicle?.label || booking.vehicle?.type || '—'}</strong>
              </div>
              <div className="tracking-detail-row">
                <span>Date</span>
                <strong>{formatDate(booking.date)}</strong>
              </div>
              <div className="tracking-detail-row">
                <span>Time</span>
                <strong>{booking.time || '—'}</strong>
              </div>
              <div className="tracking-detail-row">
                <span>Location</span>
                <strong>{booking.location || '—'}</strong>
              </div>
              <div className="tracking-detail-row">
                <span>Price</span>
                <strong>{booking.washPackage?.price ? `$${booking.washPackage.price}` : '—'}</strong>
              </div>
            </div>
          </div>

          {hasPhotos && (
            <div className="tracking-card tracking-photos-card">
              <div className="tracking-card-header">
                <h3>Photos</h3>
              </div>
              <div className="tracking-tabs">
                <button
                  className={`tracking-tab ${photoTab === 'before' ? 'active' : ''}`}
                  onClick={() => setPhotoTab('before')}
                >
                  Before
                </button>
                <button
                  className={`tracking-tab ${photoTab === 'after' ? 'active' : ''}`}
                  onClick={() => setPhotoTab('after')}
                >
                  After
                </button>
              </div>
              {currentPhotos.length > 0 ? (
                <div className="tracking-photos-grid">
                  {currentPhotos.map((url, i) => {
                    let fullUrl = url.replace('http://localhost:3000', API);
                    fullUrl = fullUrl.startsWith('http') || fullUrl.startsWith('data:') 
                      ? fullUrl 
                      : fullUrl.startsWith('/') ? `${API}${fullUrl}` : `${API}/uploads/${fullUrl}`;
                    return (
                      <img key={i} src={fullUrl} alt={`${photoTab} ${i + 1}`} className="tracking-photo" />
                    );
                  })}
                </div>
              ) : (
                <div className="tracking-photos-empty">
                  No {photoTab} photos yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!isFinished && (booking.assignedTo || booking.workerName) && (
        <ChatBox
          bookingId={bookingId}
          senderRole="user"
          workerName={booking.assignedTo?.name || booking.workerName || 'Your Worker'}
          collapsed={true}
        />
      )}
    </div>
  );
}
