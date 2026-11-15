import { useEffect, useMemo, useState } from 'react';

import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { notify } from '../utils/notify';
import AddCarModal from '../components/AddCarModal';
import AddCardModal from '../components/AddCardModal';
import CarCard from '../components/CarCard';
import ProfilePhotoCropper from '../components/ProfilePhotoCropper';
import { getBrandLogoUrl } from '../utils/logoHelper';
import './profile.css';
import './AdminPanel.css';
import { API_BASE_URL } from '../config/api';



const parseJson = (rawValue, fallback) => {
    try {
        return rawValue ? JSON.parse(rawValue) : fallback;
    } catch {
        return fallback;
    }
};

const readStoredUser = () => parseJson(localStorage.getItem('user'), null);

const readStoredArray = (keys) => {
    for (const key of keys) {
        const parsed = parseJson(localStorage.getItem(key), null);
        if (Array.isArray(parsed)) {
            return parsed;
        }
    }
    return [];
};

const formatDate = (value) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString();
};

const normalizeStatus = (status) => {
    if (!status || typeof status !== 'string') return 'pending';
    const s = status.toLowerCase();
    if (s === 'pending_activation') return 'Pending';
    return s;
};

const getStatusClass = (status) => {
    const normalized = normalizeStatus(status);
    if (['accepted', 'completed', 'confirmed', 'delivered', 'done'].includes(normalized)) {
        return 'status-success';
    }
    if (['rejected', 'cancelled', 'failed'].includes(normalized)) {
        return 'status-danger';
    }
    return 'status-warning';
};

const resolveOrderTitle = (order) =>
    order?.packageTitle ||
    order?.title ||
    order?.serviceName ||
    order?.service ||
    order?.name ||
    'Car Wash Service';

const resolveOrderAmount = (order) => {
    const amount = order?.totalAmount ?? order?.total ?? order?.price;
    return typeof amount === 'number' ? `${amount} EGP` : amount || '-';
};

const resolveOrderDetails = (order) => {
    const subscription = order?.subscriptionDetails;
    if (subscription?.isSubscription) {
        const durationMonths = Number(subscription.durationMonths || 1);
        const washesPerMonth = Number(subscription.washesPerMonth || 4);
        const startDate = formatDate(subscription.startDate);
        const endDate = formatDate(subscription.endDate);
        return (
            <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(33, 104, 228, 0.05)', borderRadius: '8px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', gap: '15px', marginBottom: '4px' }}>
                    <span><strong>Duration:</strong> {durationMonths} Month{durationMonths > 1 ? 's' : ''}</span>
                    <span><strong>Washes:</strong> {washesPerMonth} / Month</span>
                </div>
                <div style={{ display: 'flex', gap: '15px', color: 'var(--dash-text-light)' }}>
                    <span><strong>Started:</strong> {startDate}</span>
                    <span><strong>Ends:</strong> {endDate}</span>
                </div>
            </div>
        );
    }

    const firstNote = order?.items?.find((item) => item?.specialInstructions)?.specialInstructions;
    return firstNote || '';
};

const resolveBookingDate = (booking) => {
    const value = booking?.date || booking?.day || booking?.createdAt;
    if (!value) return '-';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
};

const resolveBookingTime = (booking) =>
    booking?.time || booking?.slot || booking?.washPackage?.duration || booking?.duration || '-';

const resolveBookingVehicle = (booking) => {
    const car = booking?.vehicle?.car;
    if (car && car.brand) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img 
                    src={getBrandLogoUrl(car.brand)} 
                    alt={car.brand} 
                    style={{ width: '28px', height: '28px', objectFit: 'contain' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong>{car.brand}</strong>
                    <span>{car.model}</span>
                    <span style={{ color: 'var(--dash-text-light)' }}>{car.year}</span>
                    <span className="car-plate" style={{ margin: 0, padding: '2px 8px', fontSize: '0.7rem' }}>{car.plateNumber}</span>
                </div>
            </div>
        );
    }
    return booking?.vehicle?.label || booking?.vehicleTypeLabel || booking?.vehicleLabel || booking?.vehicle || '-';
};

const getAvatarUrl = (user) => {
    if (user?.profilePhoto) {
        const photo = user.profilePhoto;
        // Already a full URL (http/https)
        if (photo.startsWith('http')) return photo;
        // Valid base64 data URL (must have actual data after the comma)
        if (photo.startsWith('data:image') && photo.includes(',') && photo.split(',')[1]?.length > 20) return photo;
        // Skip corrupt/truncated data URLs
        if (photo.startsWith('data:')) {
            // fall through to gender-based avatar
        } else {
            // Relative server path - prepend API base URL
            return `${API_BASE_URL}${photo}`;
        }
    }
    const normalized = (user?.gender || '').toLowerCase();
    if (normalized === 'female') return 'https://cdn-icons-png.flaticon.com/512/3135/3135768.png';
    return 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
};

const Profile = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Default to 'overview', but check if router state requested a specific tab (like 'reservations')
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'overview');
    
    // If we navigate back to profile with a new state while already mounted
    useEffect(() => {
        if (location.state?.activeTab) {
            setActiveTab(location.state.activeTab);
        }
    }, [location.state?.activeTab]);

    const [isLoading, setIsLoading] = useState(true);
    const [notice, setNotice] = useState('');
    const [userData, setUserData] = useState(() => readStoredUser());
    const [myOrders, setMyOrders] = useState(() => readStoredArray(['serviceOrders', 'orders']));
    const [myBookings, setMyBookings] = useState(() => readStoredArray(['washBookings', 'bookings', 'reservations']));
    const [selectedWashPackage, setSelectedWashPackage] = useState(() =>
        parseJson(localStorage.getItem('selectedWashPackage'), null),
    );
    const [editForm, setEditForm] = useState({
        name: '',
        phone: '',
        email: '',
    });
    const [isCarModalOpen, setIsCarModalOpen] = useState(false);
    const [isAddCardOpen, setIsAddCardOpen] = useState(false);
    const [myCars, setMyCars] = useState([]);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [cropperFile, setCropperFile] = useState(null);
    const [showCropper, setShowCropper] = useState(false);

    const userRole = (userData?.role || 'customer').toLowerCase();
    const firstName = (userData?.name || 'Driver').trim().split(/\s+/).join(' ');
    const points = Number(userData?.rewardsPoints) || Number(userData?.points) || 0;

    useEffect(() => {
        setEditForm({
            name: userData?.name || '',
            phone: userData?.phone || '',
            email: userData?.email || '',
        });
    }, [userData]);

    useEffect(() => {
        const syncFromStorage = () => {
            setUserData(readStoredUser());
            setMyOrders(readStoredArray(['serviceOrders', 'orders']));
            setMyBookings(readStoredArray(['washBookings', 'bookings', 'reservations']));
            setSelectedWashPackage(parseJson(localStorage.getItem('selectedWashPackage'), null));
        };

        window.addEventListener('storage', syncFromStorage);
        window.addEventListener('auth-changed', syncFromStorage);

        return () => {
            window.removeEventListener('storage', syncFromStorage);
            window.removeEventListener('auth-changed', syncFromStorage);
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        const hydrateUser = async () => {
            const token = localStorage.getItem('token');
            const cachedUser = readStoredUser();
            const isGoogleSession = cachedUser?.provider === 'google';

            if (!token) {
                if (isMounted) {
                    setIsLoading(false);
                    navigate('/login', { replace: true });
                }
                return;
            }

            if (isGoogleSession && isMounted) {
                setUserData(cachedUser);
            }

            try {
                const response = await axios.get(`${API_BASE_URL}/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!isMounted) return;

                const serverUser = response?.data?.data?.user;
                if (serverUser) {
                    const mergedUser = {
                        ...(readStoredUser() || {}),
                        ...serverUser,
                    };

                    localStorage.setItem('user', JSON.stringify(mergedUser));
                    setUserData(mergedUser);
                }
            } catch (error) {
                if (!isMounted) return;

                const isUnauthorized = error?.response?.status === 401;
                const latestUser = readStoredUser();
                const isGoogleFallback = latestUser?.provider === 'google';

                if (isGoogleFallback) {
                    setUserData(latestUser);
                    setIsLoading(false);
                    return;
                }

                if (isUnauthorized) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.dispatchEvent(new Event('auth-changed'));
                    navigate('/login', { replace: true });
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }

            // Fetch Cars Data Separately
            try {
                if (token) {
                    const carsResponse = await axios.get(`${API_BASE_URL}/cars`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (isMounted && carsResponse.data?.status === 'success') {
                        setMyCars(carsResponse.data.data.cars);
                    }
                }
            } catch (err) {
                console.error("Failed to load user cars", err);
            }

            // Fetch My Orders from DB (Mongo)
            try {
                if (token) {
                    const ordersResponse = await axios.get(`${API_BASE_URL}/order/my`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });

                    if (isMounted && ordersResponse.data?.status === 'success') {
                        const dbOrders = Array.isArray(ordersResponse.data.data) ? ordersResponse.data.data : [];
                        setMyOrders(dbOrders);
                        localStorage.setItem('serviceOrders', JSON.stringify(dbOrders));
                    }
                }
            } catch (err) {
                console.error("Failed to load user orders", err);
            }

            // Fetch My Book-Wash Reservations from DB (Mongo)
            try {
                if (token) {
                    const bookingsResponse = await axios.get(`${API_BASE_URL}/reservation/my`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });

                    if (isMounted && bookingsResponse.data?.status === 'success') {
                        const dbBookings = Array.isArray(bookingsResponse.data.data) ? bookingsResponse.data.data : [];
                        setMyBookings(dbBookings);
                        localStorage.setItem('washBookings', JSON.stringify(dbBookings));
                    }
                }
            } catch (err) {
                console.error("Failed to load user bookings", err);
            }
        };

        hydrateUser();

        return () => {
            isMounted = false;
        };
    }, [navigate]);

    const serviceRows = useMemo(() => {
        if (myOrders.length > 0) return myOrders;
        if (!selectedWashPackage) return [];

        return [
            {
                _id: 'selected-package',
                createdAt: new Date().toISOString(),
                title: selectedWashPackage.packageTitle || selectedWashPackage.title,
                totalAmount: selectedWashPackage.price,
                status: 'pending',
                subscriptionDetails: {
                    isSubscription: true,
                    durationMonths: Number(selectedWashPackage.durationMonths || 1),
                    washesPerMonth: Number(selectedWashPackage.washesPerMonth || selectedWashPackage.totalWashes || 4),
                    startDate: new Date(),
                    endDate: (() => {
                        const endDate = new Date();
                        endDate.setMonth(endDate.getMonth() + Number(selectedWashPackage.durationMonths || 1));
                        return endDate;
                    })(),
                },
            },
        ];
    }, [myOrders, selectedWashPackage]);

    const bookingRows = useMemo(() => {
        if (myBookings.length > 0) return myBookings;
        if (!selectedWashPackage) return [];

        return [
            {
                _id: 'selected-booking',
                date: 'Not scheduled yet',
                time: `${selectedWashPackage.duration} min service`,
                vehicleTypeLabel: selectedWashPackage.vehicleTypeLabel || 'Vehicle',
                status: 'pending',
            },
        ];
    }, [myBookings, selectedWashPackage]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth-changed'));
        navigate('/login', { replace: true });
    };

    const handleUpdateProfile = (event) => {
        event.preventDefault();

        const nextName = editForm.name.trim();
        const nextPhone = editForm.phone.trim();

        if (!nextName) {
            setNotice('Please enter your name before saving.');
            return;
        }

        const currentName = (userData?.name || '').trim();
        const currentPhone = (userData?.phone || '').trim();
        const changedNothing = currentName === nextName && currentPhone === nextPhone;

        if (changedNothing) {
            setNotice('No new changes detected.');
            return;
        }

        const updatedUser = {
            ...(userData || {}),
            name: nextName,
            phone: nextPhone,
        };

        localStorage.setItem('user', JSON.stringify(updatedUser));
        window.dispatchEvent(new Event('auth-changed'));
        setUserData(updatedUser);
        setNotice('Profile details updated locally on this app.');
    };

    const handlePhotoUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const token = localStorage.getItem('token');
        if (!token) return;

        // Open cropper instead of uploading directly
        setCropperFile(file);
        setShowCropper(true);

        // Reset input so the same file can be re-selected
        event.target.value = '';
    };

    const handleCroppedPhoto = async (croppedBlob) => {
        setShowCropper(false);
        setCropperFile(null);
        setIsUploadingPhoto(true);

        const token = localStorage.getItem('token');
        if (!token) {
            setIsUploadingPhoto(false);
            return;
        }

        const formData = new FormData();
        formData.append('photo', croppedBlob, 'profile-photo.jpg');

        try {
            const response = await axios.post(`${API_BASE_URL}/auth/me/photo`, formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            if (response.data?.data?.user) {
                const updatedUser = response.data.data.user;
                
                // Merge with existing cached user data just in case
                const mergedUser = { ...(userData || {}), ...updatedUser };
                setUserData(mergedUser);
                localStorage.setItem('user', JSON.stringify(mergedUser));
                window.dispatchEvent(new Event('auth-changed'));
                
                if (notify && notify.success) {
                    notify.success('Profile photo updated successfully!');
                }
            }
        } catch (error) {
            console.error('Photo upload error:', error);
            if (notify && notify.error) {
                notify.error('Failed to update profile photo.');
            }
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const handleCropperCancel = () => {
        setShowCropper(false);
        setCropperFile(null);
    };

    const handleRewardsClick = (requiredPoints) => {
        if (points < requiredPoints) {
            setNotice(`You need ${requiredPoints - points} more points to unlock this reward.`);
            return;
        }
        setNotice('Reward redemption backend is not connected yet. UI is ready.');
    };

    const handleAddCar = async (carPayload) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_BASE_URL}/cars`, carPayload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status === 'success') {
                setMyCars(prev => [...prev, res.data.data]);
                notify('Vehicle added successfully to your garage', 'success');
            }
        } catch (error) {
            console.error('Add car error:', error);
            notify(error.response?.data?.message || 'Failed to add vehicle', 'error');
        }
    };

    const handleAddCard = async (cardPayload) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_BASE_URL}/auth/me/cards`, cardPayload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status === 'success') {
                setUserData(res.data.data);
                localStorage.setItem('user', JSON.stringify(res.data.data));
                notify('Payment card added successfully', 'success');
            }
        } catch (error) {
            console.error('Add card error:', error);
            notify(error.response?.data?.message || 'Failed to add card', 'error');
        }
    };

    const handleDeleteCar = async (carId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.delete(`${API_BASE_URL}/cars/${carId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data?.status === 'success') {
                setMyCars(response.data.data.cars);
                notify.success('Success - Car removed.');
            }
        } catch (error) {
            console.error('Delete car error:', error);
            notify.error('Error - Failed to remove car.');
        }
    };

    if (isLoading) {
        return (
            <div className="dashboard-container">
                <div className="dashboard-content">
                    <div className="dashboard-card">
                        <p className="empty-text">Loading your profile...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="dashboard-container">
                <div className="dashboard-content">
                    <div className="dashboard-card">
                        <p className="empty-text">Please log in to access your profile.</p>
                        <Link className="btn-save" to="/login">
                            Go To Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const renderContent = () => {
        if (activeTab === 'orders') {
            return (
                <div className="subs-page-wrap">
                    <div className="subs-banner">
                        <div className="subs-banner-text">
                            <span className="subs-banner-kicker">💎 Premium</span>
                            <h2 className="subs-banner-title">My Subscriptions</h2>
                            <p className="subs-banner-sub">Track your active wash packages, timelines and wash credits.</p>
                        </div>
                        <div className="subs-banner-icon">🚗</div>
                    </div>

                    {serviceRows.length === 0 ? (
                        <div className="subs-empty">
                            <div className="subs-empty-icon">📦</div>
                            <h3>No subscriptions yet</h3>
                            <p>Pick a wash package and start your subscription today.</p>
                            <button className="subs-explore-btn" onClick={() => navigate('/packages')}>
                                Explore Packages →
                            </button>
                        </div>
                    ) : (
                        <div className="subs-grid">
                            {serviceRows.map((order, index) => {
                                const sub = order?.subscriptionDetails;
                                const isSubscription = sub?.isSubscription;

                                const startDate = sub?.startDate ? new Date(sub.startDate) : null;
                                const endDate = sub?.endDate ? new Date(sub.endDate) : null;
                                const now = new Date();

                                let progressPct = 0;
                                let daysLeft = null;
                                let totalDays = null;

                                if (startDate && endDate && endDate > startDate) {
                                    totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                                    const elapsed = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
                                    progressPct = Math.min(Math.max((elapsed / totalDays) * 100, 0), 100);
                                    daysLeft = Math.max(Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)), 0);
                                }

                                const status = order?.subscriptionStatus || order?.status || 'pending';
                                const statusColors = {
                                    active: { bg: '#d1fae5', color: '#065f46', dot: '#10b981' },
                                    pending: { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
                                    pending_activation: { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
                                    completed: { bg: '#e0e7ff', color: '#3730a3', dot: '#6366f1' },
                                    cancelled: { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
                                    rejected: { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
                                    expired: { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
                                };
                                const sc = statusColors[status] || statusColors.pending;

                                // Detect plan tier from title
                                const planTitle = (
                                    sub?.packageTitle ||
                                    sub?.packageId?.title ||
                                    order?.items?.[0]?.title ||
                                    resolveOrderTitle(order) ||
                                    ''
                                );
                                const planLower = planTitle.toLowerCase();

                                let cardGradient, planAccent, planIcon, planEmoji, tierLabel, textColor, subTextColor;

                                if (planLower.includes('platinum')) {
                                    cardGradient = 'linear-gradient(135deg, #611818 0%, #4a1212 50%, #3d0c0c 100%)';
                                    planAccent   = '#ff4d6d';
                                    planIcon     = '💎';
                                    planEmoji    = '✦';
                                    tierLabel    = 'Platinum';
                                    textColor    = '#ffffff';
                                    subTextColor = 'rgba(255, 255, 255, 0.7)';
                                } else if (planLower.includes('gold')) {
                                    cardGradient = 'linear-gradient(145deg, #d4af37 0%, #fde047 25%, #c59b27 50%, #fce77a 75%, #b8860b 100%)';
                                    planAccent   = '#8a6500';
                                    planIcon     = '🥇';
                                    planEmoji    = '★';
                                    tierLabel    = 'Gold';
                                    textColor    = '#2b2005';
                                    subTextColor = 'rgba(58, 43, 10, 0.7)';
                                } else if (planLower.includes('silver')) {
                                    cardGradient = 'linear-gradient(145deg, #c0c0c0 0%, #d8d8d8 25%, #a8a8a8 50%, #d0d0d0 75%, #b8b8b8 100%)';
                                    planAccent   = '#3a3a3a';
                                    planIcon     = '🥈';
                                    planEmoji    = '◆';
                                    tierLabel    = 'Silver';
                                    textColor    = '#1a1a1a';
                                    subTextColor = 'rgba(0, 0, 0, 0.6)';
                                } else {
                                    cardGradient = 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1d4ed8 100%)';
                                    planAccent   = '#60a5fa';
                                    planIcon     = '🚗';
                                    planEmoji    = '♻';
                                    tierLabel    = planTitle || 'Custom';
                                    textColor    = '#ffffff';
                                    subTextColor = 'rgba(186, 213, 255, 0.7)';
                                }

                                return (
                                    <div key={order?._id || index} className="sub-card" style={{ animationDelay: `${index * 0.1}s` }}>
                                        {/* Card Banner */}
                                        <div className="sub-card-banner" style={{ background: cardGradient }}>
                                            <div className="sub-card-banner-inner">
                                                <div>
                                                    <p className="sub-card-label" style={{ color: subTextColor, fontWeight: 800 }}>
                                                        {planIcon} {tierLabel} Plan
                                                    </p>
                                                    <h3 className="sub-card-title" style={{ color: textColor }}>{planTitle || resolveOrderTitle(order)}</h3>
                                                    <div className="sub-card-amount" style={{ color: textColor }}>
                                                        {resolveOrderAmount(order)}
                                                        <span style={{ color: subTextColor }}>/month</span>
                                                    </div>
                                                </div>
                                                <div className="sub-card-status-badge" style={{ background: sc.bg, color: sc.color }}>
                                                    <span className="sub-status-dot" style={{ background: sc.dot }}></span>
                                                    {normalizeStatus(status)}
                                                </div>
                                            </div>
                                            <div className="sub-card-watermark" style={{ color: textColor, opacity: 0.08 }}>{planEmoji}</div>
                                        </div>

                                        {/* Card Body */}
                                        <div className="sub-card-body">
                                            {/* Stats Row */}
                                            <div className="sub-stats-row" style={{ gap: '8px' }}>
                                                {order.car && (
                                                    <>
                                                        <div className="sub-stat" style={{ flex: '1.2', minWidth: 0 }}>
                                                            <span className="sub-stat-label">Vehicle</span>
                                                            <div className="sub-stat-value" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', width: '100%' }}>
                                                                <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem', lineHeight: '1.2', width: '100%', textAlign: 'center' }} title={order.car.brand}>
                                                                    {order.car.brand}
                                                                </strong>
                                                                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', lineHeight: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }} title={order.car.model}>
                                                                    {order.car.model}
                                                                </span>
                                                                <img 
                                                                    src={getBrandLogoUrl(order.car.brand)} 
                                                                    alt={order.car.brand} 
                                                                    style={{ width: '36px', height: '36px', objectFit: 'contain', marginTop: '4px' }}
                                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="sub-stat-divider" />
                                                    </>
                                                )}
                                                <div className="sub-stat" style={{ minWidth: 0 }}>
                                                    <span className="sub-stat-label">Duration</span>
                                                    <strong className="sub-stat-value" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                                        {sub?.durationMonths || 1} M
                                                    </strong>
                                                </div>
                                                <div className="sub-stat-divider" />
                                                <div className="sub-stat" style={{ minWidth: 0 }}>
                                                    <span className="sub-stat-label">Washes Done</span>
                                                    <strong className="sub-stat-value" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                                        {order?.washesUsed || 0} / {(sub?.washesPerMonth || 4) * (sub?.durationMonths || 1)}
                                                    </strong>
                                                </div>
                                            </div>

                                            {/* Wash Logs List */}
                                            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {Array.from({ length: (sub?.washesPerMonth || 4) * (sub?.durationMonths || 1) }).map((_, i) => {
                                                    const log = order?.washLogs?.[i];
                                                    return (
                                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: log ? 'rgba(16, 185, 129, 0.1)' : '#f8fafc', borderRadius: '8px', border: `1px solid ${log ? '#a7f3d0' : '#e2e8f0'}`, fontSize: '0.8rem' }}>
                                                            <strong style={{ color: log ? '#065f46' : '#64748b' }}>Wash {i + 1}</strong>
                                                            {log ? (
                                                                <span style={{ color: '#059669', fontWeight: 'bold' }}>✅ Done {new Date(log.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                                            ) : (
                                                                <span style={{ color: '#94a3b8' }}>Pending</span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Timeline */}
                                            {startDate && endDate ? (
                                                <div className="sub-timeline">
                                                    <div className="sub-timeline-header">
                                                        <span>
                                                            <strong>Started:</strong> {startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </span>
                                                        <span>
                                                            <strong>Ends:</strong> {endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    <div className="sub-progress-bg">
                                                        <div
                                                            className="sub-progress-fill"
                                                            style={{ width: `${progressPct}%`, background: daysLeft === 0 ? '#ef4444' : daysLeft <= 7 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #4361ee, #06b6d4)' }}
                                                        />
                                                    </div>
                                                    <div className="sub-progress-footer">
                                                        <span>{Math.round(progressPct)}% elapsed</span>
                                                        <span className="sub-days-left" style={{ color: daysLeft === 0 ? '#ef4444' : daysLeft <= 7 ? '#f59e0b' : '#4361ee' }}>
                                                            {daysLeft === 0 ? '🔴 Expired' : daysLeft === null ? '—' : `⏳ ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="sub-pending-notice">
                                                    <span>⏳</span> Subscription will activate once confirmed by admin.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }

        if (activeTab === 'reservations') {
            return (
                <div className="dashboard-card">
                    <div className="card-header">
                        <h3>Bookings</h3>
                        <p>Your saved wash bookings and selected package data.</p>
                    </div>
                    {bookingRows.length === 0 ? (
                        <p className="empty-text">No bookings available yet.</p>
                    ) : (
                        <div className="table-responsive">
                            <table className="dashboard-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Time / Duration</th>
                                        <th>Vehicle</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bookingRows.map((booking, index) => (
                                        <tr key={booking?._id || booking?.id || index}>
                                            <td>{resolveBookingDate(booking)}</td>
                                            <td>
                                                <span className="pill">{resolveBookingTime(booking)}</span>
                                            </td>
                                            <td>{resolveBookingVehicle(booking)}</td>
                                            <td>
                                                <span className={`badge ${getStatusClass(booking?.status)}`}>
                                                    {normalizeStatus(booking?.status)}
                                                </span>
                                            </td>
                                            <td>
                                                {booking?._id && booking?._id !== 'selected-booking' ? (
                                                    normalizeStatus(booking?.status) === 'completed' ? (
                                                        <Link 
                                                            to={`/track/${booking._id}`} 
                                                            className="btn-track-action"
                                                            style={{
                                                                display: 'inline-block',
                                                                padding: '6px 14px',
                                                                background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                                                                color: '#fff',
                                                                borderRadius: '8px',
                                                                textDecoration: 'none',
                                                                fontSize: '0.85rem',
                                                                fontWeight: 'bold',
                                                                textAlign: 'center',
                                                                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                                                                transition: 'all 0.2s ease-in-out',
                                                                border: 'none',
                                                                cursor: 'pointer'
                                                            }}
                                                            onMouseEnter={(e) => { 
                                                                e.currentTarget.style.transform = 'translateY(-1px)'; 
                                                                e.currentTarget.style.filter = 'brightness(1.1)'; 
                                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.5)';
                                                            }}
                                                            onMouseLeave={(e) => { 
                                                                e.currentTarget.style.transform = 'none'; 
                                                                e.currentTarget.style.filter = 'none'; 
                                                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(245, 158, 11, 0.3)';
                                                            }}
                                                        >
                                                            Review Service ⭐ 
                                                        </Link>
                                                    ) : normalizeStatus(booking?.status) === 'rejected' ? (
                                                        <span style={{ color: 'var(--dash-text-light)', fontSize: '0.9rem', fontWeight: 'bold' }}>Cancelled</span>
                                                    ) : (
                                                        <Link 
                                                            to={`/track/${booking._id}`} 
                                                            className="btn-track-action"
                                                            style={{
                                                                display: 'inline-block',
                                                                padding: '6px 14px',
                                                                background: 'linear-gradient(135deg, #0891b2, #22d3ee)',
                                                                color: '#fff',
                                                                borderRadius: '8px',
                                                                textDecoration: 'none',
                                                                fontSize: '0.85rem',
                                                                fontWeight: 'bold',
                                                                textAlign: 'center',
                                                                boxShadow: '0 2px 8px rgba(34, 211, 238, 0.3)',
                                                                transition: 'all 0.2s ease-in-out',
                                                                border: 'none',
                                                                cursor: 'pointer'
                                                            }}
                                                            onMouseEnter={(e) => { 
                                                                e.currentTarget.style.transform = 'translateY(-1px)'; 
                                                                e.currentTarget.style.filter = 'brightness(1.1)'; 
                                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 211, 238, 0.5)';
                                                            }}
                                                            onMouseLeave={(e) => { 
                                                                e.currentTarget.style.transform = 'none'; 
                                                                e.currentTarget.style.filter = 'none'; 
                                                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(34, 211, 238, 0.3)';
                                                            }}
                                                        >
                                                            Track Wash ➔
                                                        </Link>
                                                    )
                                                ) : (
                                                    <span style={{ color: 'var(--dash-text-light)', fontSize: '0.9rem' }}>—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            );
        }

        if (activeTab === 'settings') {
            return (
                <div className="dashboard-card">
                    <div className="card-header">
                        <h3>Account Settings</h3>
                        <p>Keep your profile information up to date.</p>
                    </div>
                    <form onSubmit={handleUpdateProfile} className="settings-form">
                        <div className="form-group">
                            <label>Full Name</label>
                            <input
                                type="text"
                                value={editForm.name}
                                onChange={(event) => setEditForm((previous) => ({ ...previous, name: event.target.value }))}
                            />
                        </div>
                        <div className="form-group">
                            <label>Phone Number</label>
                            <input
                                type="text"
                                value={editForm.phone}
                                onChange={(event) => setEditForm((previous) => ({ ...previous, phone: event.target.value }))}
                            />
                        </div>
                        <div className="form-group">
                            <label>Email (Read-only)</label>
                            <input type="email" value={editForm.email} readOnly />
                        </div>
                        <p className="empty-text" style={{ textAlign: 'left', padding: 0 }}>
                            Password change is currently handled via the forgot-password flow.
                        </p>
                        <button type="submit" className="btn-save pulse-btn">
                            Save Changes
                        </button>
                    </form>
                </div>
            );
        }

        if (activeTab === 'rewards') {
            return (
                <div className="dashboard-card">
                    <div className="card-header">
                        <h3>Loyalty Rewards</h3>
                        <p>Track your current points and unlock upcoming wash perks.</p>
                    </div>

                    <div className="points-showcase">
                        <div className="points-circle">
                            <h2>{points}</h2>
                            <span>pts</span>
                        </div>
                        <p className="points-subtitle">Current Balance</p>
                    </div>

                    <div className="rewards-list">
                        <div className={`reward-tier ${points >= 100 ? 'unlocked' : 'locked'}`}>
                            <div className="tier-icon">S</div>
                            <div className="tier-info">
                                <h4>Free Tire Shine</h4>
                                <p>100 Points</p>
                                <div className="progress-bg">
                                    <div className="progress-fill glow-fill" style={{ width: `${Math.min((points / 100) * 100, 100)}%` }} />
                                </div>
                            </div>
                            <div className="tier-status">
                                {points >= 100 ? (
                                    <button className="btn-redeem" onClick={() => handleRewardsClick(100)}>
                                        Redeem
                                    </button>
                                ) : (
                                    `${100 - points} pts left`
                                )}
                            </div>
                        </div>

                        <div className={`reward-tier ${points >= 250 ? 'unlocked' : 'locked'}`}>
                            <div className="tier-icon">W</div>
                            <div className="tier-info">
                                <h4>Free Exterior Wax</h4>
                                <p>250 Points</p>
                                <div className="progress-bg">
                                    <div className="progress-fill glow-fill" style={{ width: `${Math.min((points / 250) * 100, 100)}%` }} />
                                </div>
                            </div>
                            <div className="tier-status">
                                {points >= 250 ? (
                                    <button className="btn-redeem" onClick={() => handleRewardsClick(250)}>
                                        Redeem
                                    </button>
                                ) : (
                                    `${250 - points} pts left`
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeTab === 'wallet') {
            const savedCards = userData?.savedCards || [];
            
            return (
                <div className="dashboard-card">
                    <div className="card-header">
                        <h3>My Wallet</h3>
                        <p>Manage your saved payment methods and easily add new cards to your wallet.</p>
                    </div>
                    
                    <div className="app-container" style={{ display: 'flex', justifyContent: 'center', margin: '40px 0' }}>
                      <div className="wallet">
                        <div className="wallet-back"></div>

                        {savedCards.length > 0 ? savedCards.map((card, index) => {
                            const types = ['stripe', 'wise', 'paypal'];
                            const cardClass = types[index % 3];
                            const typeStr = (card.cardType || 'visa').toLowerCase();
                            
                            let logoElement;
                            if (typeStr === 'mastercard') {
                              logoElement = <span>MasterCard</span>;
                            } else if (typeStr === 'meeza') {
                              logoElement = <span>Meeza</span>;
                            } else {
                              logoElement = <span>Visa</span>;
                            }
                            
                            // Specific coloring logic if it is the "paypal" variant
                            const isPaypal = cardClass === 'paypal';
                            
                            return (
                                <div key={index} className={`card ${cardClass}`}>
                                  <div className="card-inner">
                                    <div className="card-top">
                                      {isPaypal ? (
                                          <span>{logoElement}</span> // could add styling, but paypal class handles colors
                                      ) : logoElement}
                                      <div className="chip"></div>
                                    </div>
                                    <div className="card-bottom">
                                      <div className="card-info">
                                        <span className="label">Holder</span>
                                        <span className="value">{card.cardName || 'ALEX SMITH'}</span>
                                      </div>
                                      <div className="card-number-wrapper">
                                        <span className="hidden-stars">**** {card.cardNumberLast4 || 'XXXX'}</span>
                                        <span className="card-number">**** **** **** {card.cardNumberLast4 || 'XXXX'}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                            );
                        }) : (
                            <div className="card stripe" style={{ opacity: 0.8 }}>
                              <div className="card-inner">
                                <div className="card-top">
                                  <span>CARD</span>
                                  <div className="chip"></div>
                                </div>
                                <div className="card-bottom">
                                  <div className="card-info">
                                    <span className="label">Holder</span>
                                    <span className="value">ADD A CARD</span>
                                  </div>
                                  <div className="card-number-wrapper">
                                    <span className="hidden-stars">**** XXXX</span>
                                    <span className="card-number">**** **** **** XXXX</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                        )}

                        <div className="pocket">
                          <svg className="pocket-svg" viewBox="0 0 280 160" fill="none">
                            <path
                              d="M 0 20 C 0 10, 5 10, 10 10 C 20 10, 25 25, 40 25 L 240 25 C 255 25, 260 10, 270 10 C 275 10, 280 10, 280 20 L 280 120 C 280 155, 260 160, 240 160 L 40 160 C 20 160, 0 155, 0 120 Z"
                              fill="#1e341e"
                            ></path>
                            <path
                              d="M 8 22 C 8 16, 12 16, 15 16 C 23 16, 27 29, 40 29 L 240 29 C 253 29, 257 16, 265 16 C 268 16, 272 16, 272 22 L 272 120 C 272 150, 255 152, 240 152 L 40 152 C 25 152, 8 152, 8 120 Z"
                              stroke="#3d5635"
                              strokeWidth="1.5"
                              strokeDasharray="6 4"
                            ></path>
                          </svg>
                          <div className="pocket-content">
                            <div style={{ color: '#a7c59e', fontSize: '15px', fontWeight: 600, margin: '5px 0 10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                              Manage Cards
                            </div>
                            <button 
                                onClick={() => setIsAddCardOpen(true)}
                                className="cool-add-card-btn"
                            >
                                <span className="plus-icon">+</span> Add New Card
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                </div>
            );
        }

        return (
            <>
            <div className="stats-grid">
                <div
                    className="stat-box blue"
                    onClick={() => setActiveTab('orders')}
                    style={{ cursor: 'pointer' }}
                >
                    <h3>{serviceRows.length}</h3>
                    <p>My Subscriptions</p>
                </div>
                <div
                    className="stat-box green"
                    onClick={() => setActiveTab('reservations')}
                    style={{ cursor: 'pointer' }}
                >
                    <h3>{bookingRows.length}</h3>
                    <p>Bookings</p>
                </div>
                <div
                    className="stat-box orange shimmer-card"
                    onClick={() => setActiveTab('rewards')}
                    style={{ cursor: 'pointer' }}
                >
                    <h3>{points}</h3>
                    <p>Loyalty Points</p>
                </div>
                <div
                    className="stat-box purple"
                    onClick={() => {
                        const carsSection = document.querySelector('.my-cars-section');
                        if (carsSection) {
                            carsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }}
                    style={{ cursor: 'pointer' }}
                >
                    <h3>{myCars ? myCars.length : 0}</h3>
                    <p>Saved Cars</p>
                </div>
            </div>

                {/* --- TOP ROW: ID CARD & QUICK ACTIONS --- */}
                <div className="dashboard-card full-width split-dashboard slide-up-hero">
                    <div className="digital-card-container hover-lift">
                        <div className={`digital-id-card shimmer-card ${userRole === 'admin' ? 'admin-theme' : 'user-theme'}`}>
                            <div className="card-top-row">
                                <div className="card-logo">Maghsaltak Member</div>
                                <div className="card-chip" />
                            </div>

                            <div className="card-middle-row">
                                <h4>{userData?.name || 'Customer'}</h4>
                                <span className="card-role-text">
                                    {userRole === 'admin' ? 'System Administrator' : 'Premium Customer'}
                                </span>
                            </div>

                            <div className="card-bottom-row">
                                <div className="card-stat">
                                    <span>Email</span>
                                    <strong>{userData?.email || '-'}</strong>
                                </div>
                                <div className="card-stat right-align">
                                    <span>Points</span>
                                    <strong>{points} pts</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="quick-actions-container">
                        <div className="qa-header">
                            <h2>
                                Welcome, {firstName}
                                <span className="wave-emoji">👋</span>
                            </h2>
                            <p>Quick actions for your next wash.</p>
                        </div>

                        <div className="qa-grid">
                            <button className="qa-btn hover-lift" onClick={() => navigate('/packages')}>
                                <div className="qa-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                                    S
                                </div>
                                <div className="qa-text">
                                    <strong>Explore Services</strong>
                                    <span>Browse wash packages</span>
                                </div>
                            </button>

                            <button className="qa-btn hover-lift" onClick={() => navigate('/book-wash')}>
                                <div className="qa-icon" style={{ background: '#f3e8ff', color: '#9333ea' }}>
                                    B
                                </div>
                                <div className="qa-text">
                                    <strong>Book A Wash</strong>
                                    <span>Schedule your next visit</span>
                                </div>
                            </button>

                            {userRole === 'admin' ? (
                                <button className="qa-btn admin-btn hover-lift" onClick={() => navigate('/admin')}>
                                    <div className="qa-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
                                        A
                                    </div>
                                    <div className="qa-text">
                                        <strong>Admin Panel</strong>
                                        <span>Open administration tools</span>
                                    </div>
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* --- BOTTOM ROW: MY GARAGE SECTION --- */}
                <div className="full-width slide-up-hero" style={{ animationDelay: '0.2s' }}>
                    <div className="my-cars-section">
                        <div className="my-cars-banner">
                            <div className="banner-top">
                                <div>
                                    <p className="banner-label">My Garage</p>
                                    <h2 className="banner-title">Your Vehicles</h2>
                                    <p className="banner-sub">
                                        {myCars && myCars.length > 0
                                            ? `${myCars.length} car${myCars.length > 1 ? 's' : ''} registered`
                                            : 'No vehicles yet — add one below'}
                                    </p>
                                </div>
                                <button className="btn-add-car" onClick={() => setIsCarModalOpen(true)}>
                                    + Add Car
                                </button>
                            </div>
                        </div>

                        {(!myCars || myCars.length === 0) ? (
                            <div className="cars-empty">
                                <div className="cars-empty-icon">🚗</div>
                                <h4>No cars added yet</h4>
                                <p>Add your first car to make booking a wash faster and easier.</p>
                                <button className="btn-add-car-empty" onClick={() => setIsCarModalOpen(true)}>
                                    + Add Your First Car
                                </button>
                            </div>
                        ) : (
                            <div className="cars-grid">
                                {myCars.map(car => (
                                    <CarCard key={car._id} car={car} onDelete={handleDeleteCar} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </>
        );
    };

    return (
        <div className="dashboard-container">
            <aside className="dashboard-sidebar">
                <div className="user-profile-snap">
                    <div className="profile-avatar-wrapper">
                        <div className={`profile-avatar ${isUploadingPhoto ? 'uploading-pulse' : ''}`} role="img" aria-label="Profile avatar">
                            <img src={getAvatarUrl(userData)} alt="Profile avatar" className={isUploadingPhoto ? 'blur-img' : ''} />
                            {isUploadingPhoto ? (
                                <div className="uploading-spinner"></div>
                            ) : (
                                <div className="upload-overlay">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom: '4px'}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                    <span>Upload</span>
                                </div>
                            )}
                        </div>
                        {!isUploadingPhoto && <div className="avatar-edit-badge">+</div>}
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handlePhotoUpload} 
                            disabled={isUploadingPhoto}
                            title="Change profile photo" 
                        />
                    </div>
                    <h4>{userData?.name || 'Customer'}</h4>
                    <span className={`sidebar-role-badge ${userRole === 'admin' ? 'admin' : 'user'}`}>
                        {userRole === 'admin' ? 'Admin' : 'Customer'}
                    </span>
                    <p>{userData?.email || '-'}</p>
                </div>

                <nav className="side-nav">
                    <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
                        Overview
                    </button>
                    <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>
                        My Subscriptions
                    </button>
                    <button
                        className={activeTab === 'reservations' ? 'active' : ''}
                        onClick={() => setActiveTab('reservations')}
                    >
                        Bookings
                    </button>
                    <button
                        className={activeTab === 'rewards' ? 'active rewards-tab-btn' : 'rewards-tab-btn'}
                        onClick={() => setActiveTab('rewards')}
                    >
                        Rewards
                    </button>
                    <button
                        className={activeTab === 'wallet' ? 'active' : ''}
                        onClick={() => setActiveTab('wallet')}
                    >
                        Wallet
                    </button>
                    <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>
                        Settings
                    </button>
                </nav>

                <button className="btn-logout slide-bg-btn" onClick={handleLogout}>
                    Log Out
                </button>
            </aside>

            <main className="dashboard-content">
                {notice ? (
                    <div className="active-reward-alert" role="status">
                        {notice}
                    </div>
                ) : null}
                {renderContent()}
            </main>

            {/* Add Car Modal */}
            <AddCarModal
                isOpen={isCarModalOpen}
                onClose={() => setIsCarModalOpen(false)}
                onAddCar={handleAddCar}
            />

            {/* Add Card Modal */}
            <AddCardModal
                isOpen={isAddCardOpen}
                onClose={() => setIsAddCardOpen(false)}
                onAddCard={handleAddCard}
            />

            {/* Profile Photo Cropper Modal */}
            {showCropper && cropperFile && (
                <ProfilePhotoCropper
                    file={cropperFile}
                    onCrop={handleCroppedPhoto}
                    onCancel={handleCropperCancel}
                />
            )}
        </div>
    );
};

export default Profile;