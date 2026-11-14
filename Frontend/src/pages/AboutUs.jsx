import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, ShieldCheck, Clock3, MapPin, Phone, Mail, Rocket, Star, HeartHandshake, CalendarCheck2, CarFront, BadgeCheck, ChevronLeft, ChevronRight, Droplets, Leaf, Percent } from 'lucide-react';
import './AboutUs.css';

const AboutUs = () => {
    const [reviews, setReviews] = useState([]);
    const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

    useEffect(() => {
        axios.get('http://localhost:8080/reservation/public/reviews')
            .then(res => {
                if (res.data?.data && res.data.data.length > 0) {
                    setReviews(res.data.data);
                } else {
                    setReviews([]);
                }
            })
            .catch(err => {
                console.error("Failed to fetch reviews", err);
                setReviews([]);
            });
    }, []);

    const nextReviews = () => {
        if (reviews.length === 0) return;
        setCurrentReviewIndex((prev) => (prev + 1) % reviews.length);
    };

    const prevReviews = () => {
        if (reviews.length === 0) return;
        setCurrentReviewIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
    };

    const visibleReviews = [];
    if (reviews.length > 0) {
        for (let i = 0; i < Math.min(4, reviews.length); i++) {
            visibleReviews.push(reviews[(currentReviewIndex + i) % reviews.length]);
        }
    }


    return (
        <div className="about-page">
            <section className="about-headline">
                <div className="about-headline__halo">
                    <div className="about-dot-grid" />
                </div>
                <div className="about-section about-headline__content">
                    <div className="about-kicker">
                        <Sparkles size={16} />
                        About Maghsaltak
                    </div>
                    <div className="about-logo-mark">M</div>
                    <h1 className="about-title">
                        Luxury Car Care.
                        <span> Delivered with Precision.</span>
                    </h1>
                    <p className="about-lead">
                        Maghsaltak is built to deliver a complete car-care experience: easy package subscriptions,
                        smart wash booking, and consistent service quality from a trained team.
                    </p>
                </div>
            </section>

            <section className="about-contact">
                <div className="about-section">
                    <div className="about-contact__heading">
                        <h2>Who We Are</h2>
                        <p>
                            We are a service-first car-care platform combining modern booking technology with premium on-ground operations.
                        </p>
                    </div>

                    <div className="about-info-grid">
                        <article className="about-info-card premium-contact-card">
                            <div className="card-icon-glow">
                                <Clock3 size={28} />
                            </div>
                            <h3>Working Hours</h3>
                            <ul className="premium-hours-list">
                                <li>
                                    <span className="day">Sunday - Thursday</span>
                                    <span className="time-badge">06:00 AM - 12:00 PM</span>
                                </li>
                                <li>
                                    <span className="day">Friday</span>
                                    <span className="time-badge">06:00 AM - 12:00 PM</span>
                                </li>
                                <li>
                                    <span className="day">Saturday</span>
                                    <span className="time-badge">06:00 AM - 12:00 PM</span>
                                </li>
                            </ul>
                        </article>

                        <article className="about-info-card premium-contact-card">
                            <div className="card-icon-glow">
                                <MapPin size={28} />
                            </div>
                            <h3>Contact & Location</h3>
                            <div className="premium-contact-lines">
                                <a href="#" className="contact-link">
                                    <div className="contact-icon"><MapPin size={18} /></div>
                                    <div className="contact-text">Rehab Compound Mall - Building G1 - Unit 206</div>
                                </a>
                                <a href="tel:0127565022" className="contact-link">
                                    <div className="contact-icon"><Phone size={18} /></div>
                                    <div className="contact-text">0127565022</div>
                                </a>
                                <a href="mailto:info@maghsaltak.com" className="contact-link">
                                    <div className="contact-icon"><Mail size={18} /></div>
                                    <div className="contact-text">info@maghsaltak.com</div>
                                </a>
                            </div>
                        </article>
                    </div>
                </div>
            </section>

            <section className="about-process">
                <div className="about-section">
                    <div className="about-values__heading">
                        <h2>How Maghsaltak Works</h2>
                    </div>
                    <div className="about-process-grid">
                        <article className="about-process-card">
                            <div className="about-value__icon"><CalendarCheck2 size={22} /></div>
                            <h3>1) Choose Your Plan</h3>
                            <p>Browse monthly packages, compare features, and subscribe in a few clicks.</p>
                        </article>
                        <article className="about-process-card">
                            <div className="about-value__icon"><CarFront size={22} /></div>
                            <h3>2) Book a Wash Slot</h3>
                            <p>Select your vehicle, location, date, and time from a guided booking flow.</p>
                        </article>
                        <article className="about-process-card">
                            <div className="about-value__icon"><BadgeCheck size={22} /></div>
                            <h3>3) Track Service Status</h3>
                            <p>Your requests and bookings are managed with clear statuses and follow-up.</p>
                        </article>
                    </div>
                </div>
            </section>

            <section className="about-values">
                <div className="about-section">
                    <div className="about-values__heading">
                        <h2>Why Customers Stay With Maghsaltak</h2>
                    </div>
                    <div className="about-values-grid">
                        <div className="about-value">
                            <div className="about-value__icon"><ShieldCheck size={22} /></div>
                            <h3>Premium Quality</h3>
                            <p>Safe products, expert tools, and detail-focused technicians in every wash.</p>
                        </div>
                        <div className="about-value">
                            <div className="about-value__icon"><Rocket size={22} /></div>
                            <h3>Fast & Reliable</h3>
                            <p>On-time booking slots, quick service flow, and smooth support when you need it.</p>
                        </div>
                        <div className="about-value">
                            <div className="about-value__icon"><HeartHandshake size={22} /></div>
                            <h3>Trusted Experience</h3>
                            <p>Built for long-term care with weekly subscriptions and consistent outcomes.</p>
                        </div>
                        <div className="about-value">
                            <div className="about-value__icon"><Star size={22} /></div>
                            <h3>Customer First</h3>
                            <p>Clear communication, transparent pricing, and a premium experience from start to finish.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* NEW: Eco-Friendly Water Saving Section */}
            <section className="about-eco-friendly">
                <div className="about-section">
                    <div className="eco-friendly-grid">
                        
                        {/* Column 1: Information & Features */}
                        <div className="eco-info-container">
                            <div className="eco-kicker">
                                <Droplets size={16} />
                                Our New Feature
                            </div>
                            <h2 className="eco-title">
                                Portable High Pressure Washer
                            </h2>
                            <p className="eco-description">
                                We are proud to introduce our latest sustainable car care technology! Maghsaltak now utilizes advanced water-saving equipment designed to offer professional-grade cleaning while protecting our environment.
                            </p>

                            <ul className="eco-benefits-list">
                                <li>
                                    <div className="benefit-icon-wrapper">
                                        <Percent size={18} />
                                    </div>
                                    <div className="benefit-text">
                                        <h4>Save up to 80% of water</h4>
                                        <p>Massive reduction in water consumption compared to traditional car washing methods.</p>
                                    </div>
                                </li>
                                <li>
                                    <div className="benefit-icon-wrapper">
                                        <Sparkles size={18} />
                                    </div>
                                    <div className="benefit-text">
                                        <h4>Powerful cleaning with less water usage</h4>
                                        <p>Our high-pressure system blasts away dirt and grime using minimal, high-efficiency spray.</p>
                                    </div>
                                </li>
                                <li>
                                    <div className="benefit-icon-wrapper">
                                        <Leaf size={18} />
                                    </div>
                                    <div className="benefit-text">
                                        <h4>Eco-friendly and sustainable washing process</h4>
                                        <p>Designed from the ground up to conserve resources and preserve local ecosystems.</p>
                                    </div>
                                </li>
                                <li>
                                    <div className="benefit-icon-wrapper">
                                        <ShieldCheck size={18} />
                                    </div>
                                    <div className="benefit-text">
                                        <h4>Reduced water waste without compromising quality</h4>
                                        <p>Enjoy a brilliant, showroom-grade shine with absolutely zero compromise on cleaning efficacy.</p>
                                    </div>
                                </li>
                                <li>
                                    <div className="benefit-icon-wrapper">
                                        <HeartHandshake size={18} />
                                    </div>
                                    <div className="benefit-text">
                                        <h4>Supports environmental conservation</h4>
                                        <p>Promotes responsible water use, aligning your regular car maintenance with green living values.</p>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        {/* Column 2: Image & Visual Badge */}
                        <div className="eco-image-container">
                            <div className="eco-image-glow-wrapper">
                                <img src="/homi/eco.png" alt="Eco Friendly Washer" className="eco-friendly-img" />
                                <div className="eco-badge-under">
                                    <Leaf className="eco-badge-icon" size={20} />
                                    <span>Eco Friendly Tech</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Water Consumption Comparison Dashboard */}
                    <div className="eco-comparison-card">
                        <h3 className="comparison-title">Water Consumption Comparison</h3>
                        <p className="comparison-subtitle">See how much water we save per vehicle compared to old methods</p>
                        
                        <div className="comparison-meters">
                            <div className="meter-row traditional">
                                <div className="meter-info">
                                    <span className="meter-label">Traditional Hose Washing</span>
                                    <span className="meter-value">200 – 500 Liters per vehicle</span>
                                </div>
                                <div className="meter-bar-outer">
                                    <div className="meter-bar-inner traditional-bar" style={{ width: '100%' }}></div>
                                </div>
                            </div>

                            <div className="meter-row pressure-washer">
                                <div className="meter-info">
                                    <span className="meter-label">High-Pressure Washing System (Portable Washer)</span>
                                    <span className="meter-value">30 – 80 Liters per vehicle</span>
                                </div>
                                <div className="meter-bar-outer">
                                    <div className="meter-bar-inner savings-bar" style={{ width: '16%' }}>
                                        <span className="savings-badge">Up to 80% Saved!</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="comparison-footer">
                            <div className="footer-fact">
                                <strong>Maghsaltak Green Promise:</strong> Every wash with our portable high pressure washer actively prevents water waste and supports sustainable natural resource usage.
                            </div>
                        </div>
                    </div>

                </div>
            </section>

            {/* NEW: Trusted Leaders / Sponsors Section */}
            <section className="about-sponsors">
                <div className="about-section">
                    <div className="about-values__heading">
                        <button className="trusted-leaders-animated-text" data-text="Trusted Leaders">
                            <span className="actual-text">&nbsp;Trusted Leaders&nbsp;</span>
                            <span aria-hidden="true" className="hover-text">&nbsp;Trusted Leaders&nbsp;</span>
                        </button>
                        <p style={{ color: 'var(--about-muted)', textAlign: 'center', marginBottom: '2rem' }}>
                            Our sponsors and partners that make our work possible.
                        </p>
                    </div>

                    <div className="sponsors-wrapper">
                        <div className="sponsors-inner" style={{ "--quantity": 9 }}>
                            {[
                                { src: '/sponsers/3M (2).jpg', name: '3M', padding: '0px', imgScale: '1.3' },
                                { src: '/sponsers/careem.jpg', name: 'Careem', padding: '10px' },
                                { src: '/sponsers/kia.png', name: 'Kia', padding: '0px', bg: '#000', radius: '0px', width: '96px', height: '96px', imgScale: '1.75' },
                                { src: '/sponsers/michelin.jpg', name: 'Michelin', padding: '10px' },
                                { src: '/sponsers/mobile.jpg', name: 'Mobil', padding: '2px', imgScale: '1.2' },
                                { src: '/sponsers/nissan.png', name: 'Nissan', padding: '10px' },
                                { src: '/sponsers/shell.png', name: 'Shell', padding: '10px' },
                                { src: '/sponsers/sonax (2).jpg', name: 'Sonax', padding: '10px' },
                                { src: '/sponsers/uber.jpg', name: 'Uber', padding: '32px' }
                            ].map((sponsor, index) => {
                                const hasBg = !!sponsor.bg;
                                return (
                                    <div
                                        className="sponsor-card"
                                        key={index}
                                        style={{
                                            "--index": index,
                                            "--color-card": "255, 255, 255"
                                        }}
                                    >
                                        {hasBg ? (
                                            <div
                                                style={{
                                                    backgroundColor: sponsor.bg,
                                                    borderRadius: sponsor.radius || '0px',
                                                    width: sponsor.width || '100%',
                                                    height: sponsor.height || '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    position: 'absolute',
                                                    top: '50%',
                                                    left: '50%',
                                                    transform: 'translate(-50%, -50%)',
                                                    zIndex: 3
                                                }}
                                            >
                                                <img
                                                    src={sponsor.src}
                                                    className="sponsor-img"
                                                    alt={`${sponsor.name} Logo`}
                                                    style={{
                                                        padding: sponsor.padding,
                                                        width: '85%',
                                                        height: '85%',
                                                        margin: 'auto',
                                                        display: 'block',
                                                        '--img-scale': sponsor.imgScale || '1'
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <img
                                                src={sponsor.src}
                                                className="sponsor-img"
                                                alt={`${sponsor.name} Logo`}
                                                style={{
                                                    padding: sponsor.padding,
                                                    width: sponsor.width || '100%',
                                                    height: sponsor.height || '100%',
                                                    margin: sponsor.margin || '0',
                                                    display: sponsor.display || 'block',
                                                    '--img-scale': sponsor.imgScale || '1'
                                                }}
                                            />
                                        )}
                                        <div className="sponsor-name-overlay">
                                            <span>{sponsor.name}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* NEW: Payment Methods Section */}
            <section className="about-payments">
                <div className="about-section">
                    <div className="about-values__heading">
                        <button className="trusted-leaders-animated-text" data-text="Payment Methods">
                            <span className="actual-text">&nbsp;Payment Methods&nbsp;</span>
                            <span aria-hidden="true" className="hover-text">&nbsp;Payment Methods&nbsp;</span>
                        </button>
                        <p style={{ color: 'var(--about-muted)', textAlign: 'center', marginBottom: '2.5rem' }}>
                            We support secure and convenient payment options for our customers.
                        </p>
                    </div>

                    <div className="payment-marquee-container">
                        <div className="payment-marquee-track">
                            {[
                                { src: '/payment/applepay.jpg', name: 'Apple Pay' },
                                { src: '/payment/mastercard.jpg', name: 'Mastercard' },
                                { src: '/payment/paypal.jpg', name: 'PayPal' },
                                { src: '/payment/visa.jpg', name: 'Visa' },
                                { src: '/payment/applepay.jpg', name: 'Apple Pay' },
                                { src: '/payment/mastercard.jpg', name: 'Mastercard' },
                                { src: '/payment/paypal.jpg', name: 'PayPal' },
                                { src: '/payment/visa.jpg', name: 'Visa' },
                                { src: '/payment/applepay.jpg', name: 'Apple Pay' },
                                { src: '/payment/mastercard.jpg', name: 'Mastercard' },
                                { src: '/payment/paypal.jpg', name: 'PayPal' },
                                { src: '/payment/visa.jpg', name: 'Visa' }
                            ].map((payment, index) => (
                                <div className="payment-card" key={index}>
                                    <img src={payment.src} alt={`${payment.name} Logo`} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="about-reviews">

                {/* Premium Reviews Header */}
                <div className="reviews-header">
                    <div className="reviews-header-badge">⭐ Client Testimonials</div>
                    <h2 className="reviews-header-title">What Our Clients Say</h2>
                    <p className="reviews-header-sub">2,157+ satisfied customers trust Maghsaltak with their vehicles</p>
                    <div className="reviews-stats-row">
                        <div className="reviews-stat">
                            <span className="reviews-stat-num">4.9</span>
                            <span className="reviews-stat-label">Avg Rating</span>
                        </div>
                        <div className="reviews-stat-divider" />
                        <div className="reviews-stat">
                            <span className="reviews-stat-num">2,157+</span>
                            <span className="reviews-stat-label">Happy Clients</span>
                        </div>
                        <div className="reviews-stat-divider" />
                        <div className="reviews-stat">
                            <span className="reviews-stat-num">98%</span>
                            <span className="reviews-stat-label">Satisfaction</span>
                        </div>
                    </div>
                </div>

                {reviews.length > 0 ? (
                    <div className="reviews-carousel-container">
                        {reviews.length > 4 && (
                            <button className="reviews-nav-btn prev-btn" onClick={prevReviews}>
                                <ChevronLeft size={24} />
                            </button>
                        )}

                        <div className="about-reviews-grid">
                            {visibleReviews.map((review, idx) => (
                                <div key={review._id || review.id || idx} className="review-card">
                                    <div className="review-stars">
                                        {[...Array(review.rating || 5)].map((_, i) => (
                                            <Star key={i} size={14} fill="#FBBF24" color="#FBBF24" />
                                        ))}
                                    </div>
                                    <p className="review-comment">"{review.reviewText || review.comment}"</p>
                                    <div className="review-author">
                                        <img src={(() => { const p = review.user?.profilePhoto; if (p) { if (p.startsWith('http')) return p; if (p.startsWith('data:')) return review.avatar || `https://i.pravatar.cc/150?img=${idx + 10}`; return `http://localhost:8080${p}`; } return review.avatar || `https://i.pravatar.cc/150?img=${idx + 10}`; })()} alt={review.userName || review.name} className="review-avatar" onError={(e) => { e.target.src = `https://i.pravatar.cc/150?img=${idx + 10}`; }} />
                                        <div className="review-author-info">
                                            <h4>{review.userName || review.name}</h4>
                                            <span>{review.role || "Verified Client"}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {reviews.length > 4 && (
                            <button className="reviews-nav-btn next-btn" onClick={nextReviews}>
                                <ChevronRight size={24} />
                            </button>
                        )}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', color: 'var(--about-muted)', padding: '2rem 1.5rem 4rem', fontSize: '1.05rem' }}>
                        No reviews yet.
                    </div>
                )}

                <div className="about-reviews-wave">
                    <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                        <path d="M0 120H1440V60C1440 60 1120 -30 720 30C320 90 0 0 0 0V120Z" fill="#F8FAFC" />
                    </svg>
                </div>
            </section>
        </div>
    );
};

export default AboutUs;