import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CarFront } from 'lucide-react';
import { getBrandLogoUrl } from '../utils/logoHelper';
import PackageCard from '../components/PackageCard';
import { notify } from '../utils/notify';
import './Packages.css';

const Packages = () => {
    const navigate = useNavigate();
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedPackageId, setSelectedPackageId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedWashPackage, setSelectedWashPackage] = useState(null);
    const [myCars, setMyCars] = useState([]);
    const [selectedCarId, setSelectedCarId] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchPackages = async () => {
            try {
                const response = await axios.get('http://localhost:8080/packages');
                if (response.data.status === 'success') {
                    setPackages(response.data.data);
                }
            } catch (err) {
                console.error("Failed to fetch packages", err);
                setError("Could not load packages at this time.");
            } finally {
                setLoading(false);
            }
        };

        fetchPackages();
    }, []);

    useEffect(() => {
        const fetchCars = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const res = await axios.get('http://localhost:8080/cars', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.data?.status === 'success') {
                        setMyCars(res.data.data.cars);
                        if (res.data.data.cars.length > 0) {
                            setSelectedCarId(res.data.data.cars[0]._id);
                        }
                    }
                } catch (err) {
                    console.error("Failed to fetch cars", err);
                }
            }
        };
        fetchCars();
    }, []);

    const handlePackageSelect = (washPackage) => {
        const token = localStorage.getItem('token');
        if (!token) {
            notify.warning('Please log in to subscribe to a package.');
            navigate('/login');
            return;
        }
        setSelectedPackageId(washPackage._id);
        setSelectedWashPackage(washPackage);
        setIsModalOpen(true);
    };

    const handleSubscribe = async () => {
        if (!selectedCarId && myCars.length > 0) {
            notify.error('Please select a car');
            return;
        }
        
        const token = localStorage.getItem('token');
        setIsSubmitting(true);
        try {
        let user;
        try {
            user = JSON.parse(localStorage.getItem('user')) || {};
        } catch {
            user = {};
        }

        const payload = {
            userName: user.name || "App User",
            userEmail: user.email || '',
            userPhone: user.phone || '0000000000',
            address: user.address || 'Address pending',
            carId: selectedCarId || undefined,
            paymentMethod: paymentMethod,
            totalAmount: Number(selectedWashPackage.price),
            items: [{ 
                packageId: selectedWashPackage._id, 
                title: selectedWashPackage.title, 
                quantity: 1, 
                unitPrice: Number(selectedWashPackage.price) 
            }],
            subscriptionDetails: {
                isSubscription: true,
                packageId: selectedWashPackage._id,
                packageTitle: selectedWashPackage.title,
                billingCycle: "monthly",
                durationMonths: 1,
                washesPerMonth: 4
            }
        };
            
            await axios.post('http://localhost:8080/order', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            notify.success('Subscription created successfully!');
            setIsModalOpen(false);
            navigate('/profile');
        } catch (err) {
            notify.error(err?.response?.data?.message || 'Failed to create subscription');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="packages-page">
            <section className="packages-shell">
                <header className="packages-header">
                    <span className="packages-header__kicker">Monthly Subscriptions</span>
                    <h1>Choose Your Monthly Wash Plan</h1>
                    <p>
                        Enjoy a spotless car all month long. We will wash your car once a week (4 times a month) based on your chosen tier.
                    </p>
                </header>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '50px 0' }}>Loading packages...</div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '50px 0', color: 'red' }}>{error}</div>
                ) : packages.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px 0' }}>No packages currently available.</div>
                ) : (
                    <div className="packages-grid">
                        {packages.map((washPackage) => {
                            // Extract features safely
                            const features = washPackage.description 
                                ? washPackage.description.split('\n').filter(Boolean)
                                : ["Premium service"];

                            // --- NEW LOGIC: Determine the variant color based on the package title ---
                            let cardVariant = 'basic'; // Default
                            const titleLower = (washPackage.title || '').toLowerCase();
                            
                            let originalPrice = null;

                            if (titleLower.includes('silver')) {
                                cardVariant = 'silver';
                                originalPrice = 800;
                            } else if (titleLower.includes('platinum') || titleLower.includes('diamond')) {
                                cardVariant = 'platinum';
                                originalPrice = 1800;
                            } else if (titleLower.includes('gold') || titleLower.includes('premium')) {
                                cardVariant = 'premium';
                                originalPrice = 1200;
                            }
                            // If you want EVERY card to use the new design regardless of title, 
                            // comment out the if/else block above and just use:
                            // let cardVariant = 'premium'; 
                            // ------------------------------------------------------------------------

                            return (
                                <PackageCard
                                    key={washPackage._id}
                                    title={washPackage.title}
                                    price={washPackage.price}
                                    originalPrice={originalPrice}
                                    duration={`${washPackage.stock || '1 Month'} (4 Washes)`}
                                    image={washPackage.images && washPackage.images.length > 0 ? `http://localhost:8080/${washPackage.images}` : null}
                                    features={features}
                                    isPopular={Number(washPackage.price) >= 500 && Number(washPackage.price) < 1000}
                                    isSelected={selectedPackageId === washPackage._id}
                                    onSelect={() => handlePackageSelect(washPackage)}
                                    variant={cardVariant} // <-- Passing the variant down to the card
                                />
                            );
                        })}
                    </div>
                )}
            </section>

            {isModalOpen && selectedWashPackage && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                            <h2 style={{color: 'var(--package-ink)', fontSize: '1.5rem', margin: 0}}>Subscribe to {selectedWashPackage.title}</h2>
                            <button onClick={() => setIsModalOpen(false)} style={{background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--package-muted)'}}>&times;</button>
                        </div>
                        <p style={{fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--package-primary)', marginBottom: '20px'}}>
                            {selectedWashPackage.price} EGP / month
                        </p>
                        
                        <div className="form-group" style={{textAlign: 'left', marginBottom: '20px'}}>
                            <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--package-ink)'}}>Select Car</label>
                            {myCars.length > 0 ? (
                                <div className="options-grid">
                                    {myCars.map(car => {
                                        const logoUrl = getBrandLogoUrl(car.brand);
                                        return (
                                            <div 
                                                key={car._id} 
                                                className={`option-card ${selectedCarId === car._id ? 'selected' : ''}`}
                                                onClick={() => setSelectedCarId(car._id)}
                                            >
                                                <div className="car-color-badge" style={{ backgroundColor: logoUrl ? '#fff' : (car.color || '#333') }}>
                                                    {logoUrl && (
                                                        <img 
                                                            src={logoUrl} 
                                                            alt={`${car.brand} logo`} 
                                                            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }}
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
                                                                e.target.parentElement.style.backgroundColor = car.color || '#333';
                                                            }}
                                                        />
                                                    )}
                                                    <CarFront size={28} color="#fff" style={{ display: logoUrl ? 'none' : 'block' }} />
                                                </div>
                                                <h3 style={{fontSize: '0.9rem', margin: '5px 0', color: 'var(--package-ink)'}}>{car.year} {car.brand} {car.model}</h3>
                                                <p className="plate-badge">{car.plateNumber}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p style={{color: '#f59e0b', fontSize: '0.9rem', marginBottom: '10px'}}>
                                    You don't have any cars registered. You can subscribe now and add a car later from your profile.
                                </p>
                            )}
                        </div>

                        <div className="form-group" style={{textAlign: 'left', marginBottom: '25px'}}>
                            <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--package-ink)'}}>Payment Method</label>
                            <div className="payment-options" style={{display: 'flex', gap: '10px'}}>
                                <label 
                                    className={`payment-option ${paymentMethod === 'cash' ? 'selected' : ''}`} 
                                    onClick={() => setPaymentMethod('cash')}
                                    style={{flex: 1, padding: '12px', textAlign: 'center', border: `2px solid ${paymentMethod === 'cash' ? 'var(--package-primary)' : 'var(--package-line)'}`, borderRadius: '8px', cursor: 'pointer', background: paymentMethod === 'cash' ? 'rgba(33, 104, 228, 0.1)' : 'transparent', color: 'var(--package-ink)', fontWeight: '600'}}
                                >
                                    Cash on Delivery
                                </label>
                                <label 
                                    className={`payment-option ${paymentMethod === 'visa' ? 'selected' : ''}`} 
                                    onClick={() => setPaymentMethod('visa')}
                                    style={{flex: 1, padding: '12px', textAlign: 'center', border: `2px solid ${paymentMethod === 'visa' ? 'var(--package-primary)' : 'var(--package-line)'}`, borderRadius: '8px', cursor: 'pointer', background: paymentMethod === 'visa' ? 'rgba(33, 104, 228, 0.1)' : 'transparent', color: 'var(--package-ink)', fontWeight: '600'}}
                                >
                                    Visa / Mastercard
                                </label>
                            </div>
                        </div>

                        <div className="modal-actions" style={{display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '20px'}}>
                            <button 
                                onClick={() => setIsModalOpen(false)} 
                                disabled={isSubmitting}
                                style={{padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--package-line)', background: 'transparent', color: 'var(--package-ink)', cursor: 'pointer', fontWeight: 'bold'}}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSubscribe} 
                                disabled={isSubmitting}
                                style={{padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--package-primary)', color: '#fff', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: isSubmitting ? 0.7 : 1}}
                            >
                                {isSubmitting ? 'Processing...' : 'Confirm Subscription'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Packages;