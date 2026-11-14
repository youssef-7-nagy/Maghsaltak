import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getBrandLogoUrl } from '../utils/logoHelper';
import './Cart.css';

const API = 'http://localhost:8080';

const parseStoredUser = () => {
    try {
        return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
        return null;
    }
};

const Cart = () => {
    const navigate = useNavigate();
    const [cartItem, setCartItem] = useState(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Form states
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');

    // Car selection states
    const [userCars, setUserCars] = useState([]);
    const [selectedCarId, setSelectedCarId] = useState('');
    const [carsLoading, setCarsLoading] = useState(false);

    useEffect(() => {
        const item = localStorage.getItem('cartItem');
        if (item) {
            setCartItem(JSON.parse(item));
        }

        const storedUser = parseStoredUser();
        if (storedUser?.phone) {
            setPhone(storedUser.phone);
        }

        // Fetch user's registered cars
        const token = localStorage.getItem('token');
        if (token) {
            setCarsLoading(true);
            axios.get(`${API}/cars`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then(res => {
                const cars = res.data?.data?.cars || [];
                setUserCars(cars);
                // Auto-select if only one car
                if (cars.length === 1) setSelectedCarId(cars[0]._id);
            })
            .catch(() => setUserCars([]))
            .finally(() => setCarsLoading(false));
        }
    }, []);

    const handleCheckout = async (e) => {
        e.preventDefault();

        if (!selectedCarId) {
            alert("Please select a car from your garage for this subscription.");
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            alert("Please log in to complete your checkout.");
            navigate('/login');
            return;
        }

        let user;
        try {
            user = JSON.parse(localStorage.getItem('user'));
        } catch {
            user = { name: "Guest User" };
        }

        setLoading(true);

        const durationMonths = Number(cartItem.durationMonths || 1);
        const washesPerMonth = Number(cartItem.washesPerMonth || cartItem.totalWashes || 4);
        const subscriptionNote = `${durationMonths} month plan | ${washesPerMonth} washes per month | Billing: monthly`;

        const payload = {
            userName: user.name || "App User",
            userEmail: user.email || '',
            userPhone: phone || user.phone || '',
            address: address,
            totalAmount: Number(cartItem.price),
            paymentMethod: "cash",
            carId: selectedCarId,
            items: [
                {
                    packageId: cartItem.packageId || cartItem.id,
                    title: cartItem.title,
                    quantity: 1,
                    unitPrice: Number(cartItem.price),
                    specialInstructions: subscriptionNote
                }
            ],
            subscriptionDetails: {
                isSubscription: true,
                packageId: cartItem.packageId || cartItem.id,
                packageTitle: cartItem.title,
                billingCycle: cartItem.billingCycle || 'monthly',
                durationMonths,
                washesPerMonth,
            },
        };

        try {
            const response = await axios.post(`${API}/order`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const createdOrder = response?.data?.data;
            if (createdOrder) {
                let existingOrders = [];
                try {
                    existingOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]');
                    if (!Array.isArray(existingOrders)) existingOrders = [];
                } catch {
                    existingOrders = [];
                }
                localStorage.setItem('serviceOrders', JSON.stringify([createdOrder, ...existingOrders]));
            }

            setSuccess(true);
            localStorage.removeItem('cartItem');
            window.dispatchEvent(new Event('auth-changed'));
        } catch (error) {
            console.error("Checkout failed:", error);
            const message = error?.response?.data?.message || "There was an issue processing your order. Please try again.";
            alert(message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="cart-container success-view">
                <div className="success-card">
                    <div className="success-icon">✓</div>
                    <h2>Subscription Requested!</h2>
                    <p>Thank you for subscribing. Your package subscription is now pending activation. The admin will activate it shortly after confirming payment.</p>
                    <button className="book-btn-primary" onClick={() => navigate('/profile')}>
                        Go To Profile
                    </button>
                </div>
            </div>
        );
    }

    if (!cartItem) {
        return (
            <div className="cart-container empty-view">
                <h2>Your Cart is Empty</h2>
                <p>Looks like you haven't selected a wash package yet.</p>
                <button className="book-btn-primary" onClick={() => navigate('/packages')}>
                    View Packages
                </button>
            </div>
        );
    }

    return (
        <div className="cart-container">
            <h1 className="cart-title">Checkout</h1>

            <div className="cart-content">
                <div className="cart-summary">
                    <h3>Order Summary</h3>
                    <div className="cart-item-card">
                        <img src={cartItem.image} alt={cartItem.title} className="cart-item-img" />
                        <div className="cart-item-details">
                            <h4>{cartItem.title}</h4>
                            <p>{cartItem.duration}</p>
                            <p>{Number(cartItem.washesPerMonth || cartItem.totalWashes || 4)} washes/month</p>
                            <span className="cart-item-price">{cartItem.price} EGP</span>
                        </div>
                    </div>

                    <div className="cart-total-row">
                        <span>Total Checkout</span>
                        <strong>{cartItem.price} EGP</strong>
                    </div>
                </div>

                <div className="cart-checkout-form">
                    <h3>Contact Information</h3>
                    <form onSubmit={handleCheckout}>
                        <div className="input-group">
                            <label>Phone Number *</label>
                            <input
                                type="tel"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="01xxxxxxxxx"
                            />
                        </div>
                        <div className="input-group">
                            <label>Delivery / Location Address *</label>
                            <textarea
                                required
                                rows="3"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Enter your full address..."
                            ></textarea>
                        </div>

                        {/* ── Car Selector ── */}
                        <div className="input-group">
                            <label>Select Your Car *</label>
                            {carsLoading ? (
                                <div className="car-picker-loading">Loading your cars...</div>
                            ) : userCars.length === 0 ? (
                                <div className="car-picker-empty">
                                    <span>🚗</span>
                                    <p>No cars in your garage yet.</p>
                                    <button
                                        type="button"
                                        className="car-picker-add-btn"
                                        onClick={() => navigate('/profile')}
                                    >
                                        Add a Car First
                                    </button>
                                </div>
                            ) : (
                                <div className="car-picker-grid">
                                    {userCars.map(car => (
                                        <div
                                            key={car._id}
                                            className={`car-pick-card ${selectedCarId === car._id ? 'selected' : ''}`}
                                            onClick={() => setSelectedCarId(car._id)}
                                        >
                                            <img
                                                src={getBrandLogoUrl(car.brand)}
                                                alt={car.brand}
                                                className="car-pick-logo"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                            <div className="car-pick-info">
                                                <strong>{car.brand} {car.model}</strong>
                                                <span>{car.year} · {car.plateNumber}</span>
                                                <small style={{ color: car.color, textTransform: 'capitalize' }}>● {car.color}</small>
                                            </div>
                                            {selectedCarId === car._id && (
                                                <span className="car-pick-check">✓</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="payment-method">
                            <label>Payment Method</label>
                            <div className="payment-box">
                                <input type="radio" checked readOnly />
                                <span>Cash on Delivery</span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="book-btn-primary checkout-btn"
                            disabled={loading || userCars.length === 0}
                        >
                            {loading ? "Processing..." : "Complete Purchase"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Cart;
