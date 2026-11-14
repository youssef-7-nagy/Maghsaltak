import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CarFront, MapPin, CalendarClock, CreditCard, 
    CheckCircle2, ChevronRight, ChevronLeft, ShieldCheck, Waves, Sparkles, Droplets, Map
} from 'lucide-react';
import { notify } from '../utils/notify';
import './BookWash.css';
import { getBrandLogoUrl } from '../utils/logoHelper';
import { ChipSvg, ContactlessSvg } from '../assets/cardIcons.jsx';

// 1. Vehicles
const vehicleTypes = [
    { id: 'sedan', label: 'Sedan', icon: CarFront, desc: 'Standard 4-door cars' },
    { id: 'suv', label: 'SUV / Truck', icon: ShieldCheck, desc: 'Larger vehicles, 4x4s' },
    { id: 'luxury', label: 'Luxury / Exotic', icon: Sparkles, desc: 'Special care & handling' }
];

// 2. Services (Multi-select)
const availableServices = [
    { id: 'exterior', name: 'Exterior Wash', price: 150, icon: Waves, desc: 'Complete outer body foam wash & dry', type: 'core' },
    { id: 'interior', name: 'Interior Wash', price: 100, icon: Sparkles, desc: 'Vacuuming, wiping, and interior conditioning', type: 'core' },
    { id: 'engine', name: 'Engine Cleaning', price: 100, icon: CarFront, desc: 'Safe degreasing and detailed engine bay clean', type: 'addon' },
    { id: 'tire', name: 'Tire Cleaning', price: 50, icon: Droplets, desc: 'Deep rim scrub and tire shine application', type: 'addon' },
    { id: 'trunk', name: 'Trunk Cleaning', price: 50, icon: ShieldCheck, desc: 'Deep vacuuming and organizing of the trunk', type: 'addon' }
];

// 3. Time Slots (10:00 AM - 10:00 PM)
const generateTimeSlots = () => {
    const slots = [];
    for (let i = 10; i <= 22; i++) {
        const ampm = i >= 12 ? 'PM' : 'AM';
        const hour = i > 12 ? i - 12 : i;
        slots.push(`${hour}:00 ${ampm}`);
    }
    return slots;
};
const timeSlots = generateTimeSlots();

// 4. Locations in Egypt
const serviceAreas = [
    'New Cairo (Tagamoa)', 'Sheikh Zayed', '6th of October', 
    'Nasr City', 'Heliopolis'
];

const pageVariants = {
    initial: { opacity: 0, x: 20 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: -20 }
};

// --- Step Components ---

const StepVehicles = ({ formData, updateForm, myCars }) => {
    const cars = myCars || [];

    return (
        <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} className="step-container">
            <h2>Select Your Vehicle</h2>
            <p className="step-subtitle">Choose which car needs a wash today.</p>
            
            {cars.length > 0 ? (
                <div className="options-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    {cars.map(car => {
                        const logoUrl = getBrandLogoUrl(car.brand);
                        return (
                            <div 
                                key={car._id} 
                                className={`option-card ${formData.vehicle === car._id ? 'selected' : ''}`}
                                onClick={() => updateForm('vehicle', car._id)}
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
                                <h3>{car.year} {car.brand} {car.model}</h3>
                                <p className="plate-badge">{car.plateNumber}</p>
                            </div>
                        );
                    })}
                    <div 
                        className={`option-card ${formData.vehicle === 'other' ? 'selected' : ''}`}
                        onClick={() => updateForm('vehicle', 'other')}
                    >
                        <CarFront size={32} className="option-icon" />
                        <h3>Other Vehicle</h3>
                        <p>Not listed above</p>
                    </div>
                </div>
            ) : (
                <div className="options-grid">
                    {vehicleTypes.map(v => (
                        <div 
                            key={v.id} 
                            className={`option-card ${formData.vehicle === v.id ? 'selected' : ''}`}
                            onClick={() => updateForm('vehicle', v.id)}
                        >
                            <v.icon size={32} className="option-icon" />
                            <h3>{v.label}</h3>
                            <p>{v.desc}</p>
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
};

const StepServices = ({ formData, toggleService, currentTotal }) => {
    const hasRequiredService = formData.services.includes('exterior') || formData.services.includes('interior');
    const hasAddonsOnly = formData.services.length > 0 && !hasRequiredService;

    return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} className="step-container">
        <h2>Select Services</h2>
        <p className="step-subtitle">Customize your wash. Select one or multiple services.</p>
        
        <AnimatePresence>
            {hasAddonsOnly && (
                <motion.div 
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    className="addon-warning-banner"
                >
                    <div className="addon-warning-content">
                        <span className="warning-icon">⚠️</span> 
                        <span>Please select at least one <strong>Core Wash</strong> to book additional services.</span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        <div className="services-grid">
            {availableServices.map(service => {
                const isSelected = formData.services.includes(service.id);
                return (
                    <div 
                        key={service.id} 
                        className={`book-service-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleService(service.id)}
                    >
                        {service.type === 'core' && <div className="service-badge core-badge">Core Wash</div>}
                        {service.type === 'addon' && <div className="service-badge addon-badge">Add-on</div>}
                        
                        <div className="service-header">
                            <div className="service-title">
                                <service.icon size={20} className={isSelected ? 'text-accent' : ''} />
                                <h3>{service.name}</h3>
                            </div>
                            <div className="service-price">{service.price} EGP</div>
                        </div>
                        <p className="service-desc">{service.desc}</p>
                        <div className={`checkbox-indicator ${isSelected ? 'checked' : ''}`}>
                            {isSelected && <CheckCircle2 size={16} color="#fff" />}
                        </div>
                    </div>
                );
            })}
        </div>
        <div className="live-total-banner">
            <span>Current Total:</span>
            <strong>{currentTotal} EGP</strong>
        </div>
    </motion.div>
    );
};

const StepSchedule = ({ formData, updateForm, bookedSlots = [] }) => {
    return (
        <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} className="step-container form-layout">
            <h2>When should we arrive?</h2>
            <p className="step-subtitle">Pick a date and an available time slot.</p>
            
            <div className="form-group">
                <label><CalendarClock size={16}/> Select Date</label>
                <input 
                    type="date" 
                    min={new Date().toISOString().split('T')}
                    value={formData.date}
                    onChange={(e) => updateForm('date', e.target.value)}
                />
            </div>

            {formData.date && (
                <div className="form-group mt-4">
                    <label>Available Time Slots</label>
                    <div className="time-slots-grid">
                        {timeSlots.map(time => {
                            const isBooked = bookedSlots.includes(time);
                            return (
                                <button
                                    key={time}
                                    type="button"
                                    disabled={isBooked}
                                    className={`time-slot ${formData.time === time ? 'selected' : ''} ${isBooked ? 'booked' : ''}`}
                                    onClick={() => updateForm('time', time)}
                                >
                                    {time}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </motion.div>
    );
};

const StepLocation = ({ formData, updateForm }) => (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} className="step-container form-layout">
        <h2>Where are you?</h2>
        <p className="step-subtitle">Select your area and provide exact details.</p>
        
        <div className="form-group">
            <label><Map size={16}/> Service Area</label>
            <select 
                value={formData.area} 
                onChange={(e) => updateForm('area', e.target.value)}
                className="custom-select"
            >
                <option value="">-- Choose your area --</option>
                {serviceAreas.map(area => (
                    <option key={area} value={area}>{area}</option>
                ))}
            </select>
        </div>

        <div className="form-group mt-4">
            <label><MapPin size={16}/> Exact Address (Details)</label>
            <textarea 
                rows="3"
                placeholder="Building number, street name, landmarks..." 
                value={formData.exactAddress}
                onChange={(e) => updateForm('exactAddress', e.target.value)}
            />
        </div>
    </motion.div>
);

const StepReview = ({ formData, myCars, currentTotal, updateForm, userData }) => {
    const savedCards = userData?.savedCards || [];
    
    return (
        <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} className="step-container review-layout">
            <h2>Review & Payment</h2>
            <p className="step-subtitle">Double-check your details and select a payment method.</p>

            <div className="review-card">
                <div className="review-row">
                    <span className="review-label">Vehicle</span>
                    <span className="review-value">
                        {formData.vehicle && myCars.find(c => c._id === formData.vehicle) 
                            ? `${myCars.find(c => c._id === formData.vehicle).brand} ${myCars.find(c => c._id === formData.vehicle).model}`
                            : vehicleTypes.find(v => v.id === formData.vehicle)?.label}
                    </span>
                </div>
                <div className="review-row align-top">
                    <span className="review-label">Services</span>
                    <span className="review-value">
                        {formData.services.map(id => availableServices.find(s => s.id === id)?.name).join(', ')}
                    </span>
                </div>
                <div className="review-row">
                    <span className="review-label">Schedule</span>
                    <span className="review-value">{formData.date} at {formData.time}</span>
                </div>
                <div className="review-row align-top">
                    <span className="review-label">Location</span>
                    <span className="review-value text-right">
                        <strong>{formData.area}</strong><br/>
                        <span className="text-sm text-gray">{formData.exactAddress}</span>
                    </span>
                </div>
                
                <div className="review-total">
                    <span>Total Price</span>
                    <strong>{currentTotal} EGP</strong>
                </div>
            </div>

            <div className="payment-selection">
                <h3>Payment Method</h3>
                <div className="payment-options">
                    <label className={`payment-option ${formData.paymentMethod === 'cash' ? 'selected' : ''}`} onClick={() => updateForm('paymentMethod', 'cash')}>
                        <div className={`checkbox-indicator ${formData.paymentMethod === 'cash' ? 'checked' : ''}`}>
                            {formData.paymentMethod === 'cash' && <CheckCircle2 size={14} color="#fff" />}
                        </div>
                        Cash on Delivery
                    </label>
                    <label className={`payment-option ${formData.paymentMethod === 'visa' ? 'selected' : ''}`} onClick={() => updateForm('paymentMethod', 'visa')}>
                        <div className={`checkbox-indicator ${formData.paymentMethod === 'visa' ? 'checked' : ''}`}>
                            {formData.paymentMethod === 'visa' && <CheckCircle2 size={14} color="#fff" />}
                        </div>
                        Visa / Mastercard
                    </label>
                </div>

                {formData.paymentMethod === 'visa' && (
                    <div className="visa-card-section">
                        {savedCards.length > 0 && (
                            <div className="saved-cards-selector">
                                <h4>Select a Payment Method</h4>
                                <div className="saved-cards-list">
                                    {savedCards.map((card, idx) => (
                                        <div 
                                            key={card._id} 
                                            className={`saved-card-item ${formData.selectedSavedCardId === card._id ? 'selected' : ''}`}
                                            onClick={() => {
                                                updateForm('useSavedCard', true);
                                                updateForm('selectedSavedCardId', card._id);
                                            }}
                                        >
                                            <div className={`saved-card-icon card-color-${idx % 5}`}><CreditCard size={18} color="#fff" /></div>
                                            <div className="saved-card-info">
                                                <span className="card-mask">**** **** **** {card.cardNumberLast4}</span>
                                                <span className="card-name-sm">{card.cardName}</span>
                                            </div>
                                            <div className="check-wrapper">
                                                {formData.selectedSavedCardId === card._id && <CheckCircle2 size={18} color="#3be60b" />}
                                            </div>
                                        </div>
                                    ))}
                                    <div 
                                        className={`saved-card-item add-new ${formData.selectedSavedCardId === 'new' ? 'selected' : ''}`}
                                        onClick={() => {
                                            updateForm('useSavedCard', false);
                                            updateForm('selectedSavedCardId', 'new');
                                        }}
                                    >
                                        <div className="saved-card-icon new-icon">+</div>
                                        <div className="saved-card-info">
                                            <span className="card-mask">Add a new card</span>
                                        </div>
                                        <div className="check-wrapper">
                                            {formData.selectedSavedCardId === 'new' && <CheckCircle2 size={18} color="#3be60b" />}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {(!savedCards.length || formData.selectedSavedCardId === 'new') && (
                            <div className="new-card-container">
                                <div className={`flip-card ${formData.cardFlipped ? 'flipped' : ''}`}>
                            <div className="flip-card-inner">
                                <div className="flip-card-front">
                                    <p className="heading_8264">MASTERCARD</p>
                                    <svg className="logo" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="36" height="36" viewBox="0 0 48 48">
                                    <path fill="#ff9800" d="M32 10A14 14 0 1 0 32 38A14 14 0 1 0 32 10Z"></path><path fill="#d50000" d="M16 10A14 14 0 1 0 16 38A14 14 0 1 0 16 10Z"></path><path fill="#ff3d00" d="M18,24c0,4.755,2.376,8.95,6,11.48c3.624-2.53,6-6.725,6-11.48s-2.376-8.95-6-11.48 C20.376,15.05,18,19.245,18,24z"></path>
                                    </svg>
                                    <ChipSvg />
                                    <ContactlessSvg />
                                    <p className="number">{formData.cardNumber || "#### #### #### ####"}</p>
                                    <p className="valid_thru">VALID THRU</p>
                                    <p className="date_8264">{formData.cardExpiry || "MM/YY"}</p>
                                    <p className="name">{formData.cardName || "CARDHOLDER NAME"}</p>
                                </div>
                                <div className="flip-card-back">
                                    <div className="strip"></div>
                                    <div className="mstrip"></div>
                                    <div className="sstrip">
                                      <p className="code">{formData.cardCvv || "***"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="visa-form form-layout">
                            <div className="form-group">
                                <label>Cardholder Name</label>
                                <input type="text" placeholder="John Doe" value={formData.cardName} onChange={(e) => updateForm('cardName', e.target.value)} onFocus={() => updateForm('cardFlipped', false)} />
                            </div>
                            <div className="form-group">
                                <label>Card Number</label>
                                <input type="text" placeholder="XXXX XXXX XXXX XXXX" maxLength="19" value={formData.cardNumber} 
                                    onChange={(e) => {
                                        let val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                                        let matches = val.match(/\d{4,16}/g);
                                        let match = matches && matches[0] || '';
                                        let parts = [];
                                        for (let i=0, len=match.length; i<len; i+=4) {
                                            parts.push(match.substring(i, i+4));
                                        }
                                        if (parts.length) { val = parts.join(' '); }
                                        updateForm('cardNumber', val);
                                    }} 
                                    onFocus={() => updateForm('cardFlipped', false)} 
                                />
                            </div>
                            <div className="form-group" style={{ flexDirection: 'row', gap: '10px' }}>
                                <div className="flex-1 w-full">
                                    <label>Expiry Date</label>
                                    <input type="text" placeholder="MM/YY" maxLength="5" value={formData.cardExpiry} 
                                        onChange={(e) => {
                                            let val = e.target.value.replace(/\D/g, '');
                                            if (val.length > 2) val = val.slice(0,2) + '/' + val.slice(2,4);
                                            updateForm('cardExpiry', val);
                                        }}
                                        onFocus={() => updateForm('cardFlipped', false)} 
                                    />
                                </div>
                                <div className="flex-1 w-full">
                                    <label>CVV</label>
                                    <input type="text" placeholder="123" maxLength="4" value={formData.cardCvv} 
                                        onChange={(e) => updateForm('cardCvv', e.target.value.replace(/\D/g, ''))}
                                        onFocus={() => updateForm('cardFlipped', true)} 
                                        onBlur={() => updateForm('cardFlipped', false)} 
                                    />
                                </div>
                            </div>
                        </div>
                            </div>
                        )}
                </div>
                )}
            </div>
        </motion.div>
    );
};

const StepSuccess = ({ navigate }) => (
    <motion.div initial="initial" animate="in" variants={pageVariants} className="step-container success-layout">
        <motion.div 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="success-icon"
        >
            <CheckCircle2 size={80} />
        </motion.div>
        <h2>Booking Confirmed!</h2>
        <p>The Maghsaltak team will arrive at your location as scheduled.</p>
        <button className="book-btn-primary mt-6" onClick={() => navigate('/profile', { state: { activeTab: 'reservations' } })}>
            Go To My Bookings
        </button>
    </motion.div>
);

const BookWash = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        vehicle: '',
        services: [],
        date: '',
        time: '',
        area: '',
        exactAddress: '',
        paymentMethod: 'cash',
        cardName: '',
        cardNumber: '',
        cardExpiry: '',
        cardCvv: '',
        cardFlipped: false,
        useSavedCard: false,
        selectedSavedCardId: null
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [myCars, setMyCars] = useState([]);
    const [bookedSlots, setBookedSlots] = useState([]);
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                setUserData(parsed);
                if (parsed.savedCards?.length > 0) {
                    setFormData(prev => ({ ...prev, useSavedCard: true, selectedSavedCardId: parsed.savedCards[0]._id }));
                }
            } catch (e) {
                console.error("Failed to parse user data", e);
            }
        }
    }, []);

    useEffect(() => {
        const loadCars = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const res = await axios.get('http://localhost:8080/cars', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.data?.status === 'success') {
                        setMyCars(res.data.data.cars);
                    }
                } catch (error) {
                    console.error("Failed to load user cars", error);
                }
            }
        };
        loadCars();
    }, []);

    useEffect(() => {
        const fetchSlots = async () => {
            if (!formData.date) {
                setBookedSlots([]);
                return;
            }
            try {
                const res = await axios.get(`http://localhost:8080/reservation/slots?date=${formData.date}`);
                if (res.data?.status === 'success') {
                    setBookedSlots(res.data.data);
                }
            } catch (error) {
                console.error("Failed to load booked slots", error);
            }
        };
        fetchSlots();
    }, [formData.date]);

    const currentTotal = useMemo(() => {
        return availableServices
            .filter(s => formData.services.includes(s.id))
            .reduce((sum, s) => sum + s.price, 0);
    }, [formData.services]);

    const handleNext = () => setStep(prev => Math.min(prev + 1, 6));
    const handlePrev = () => setStep(prev => Math.max(prev - 1, 1));
    
    const updateForm = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const toggleService = (serviceId) => {
        setFormData(prev => {
            const isSelected = prev.services.includes(serviceId);
            const newServices = isSelected 
                ? prev.services.filter(id => id !== serviceId)
                : [...prev.services, serviceId];
            return { ...prev, services: newServices };
        });
    };

    const handleComplete = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            notify.warning('Please login first to book your wash.');
            navigate('/login');
            return;
        }

        const selectedCar = (myCars || []).find(car => car._id === formData.vehicle);
        const selectedVehicleType = vehicleTypes.find(v => v.id === formData.vehicle);
        const fullServices = availableServices.filter(s => formData.services.includes(s.id));

        let visaPaymentDetails = undefined;
        if (formData.paymentMethod === 'visa') {
            if (formData.useSavedCard && formData.selectedSavedCardId && formData.selectedSavedCardId !== 'new') {
                const card = userData?.savedCards?.find(c => c._id === formData.selectedSavedCardId);
                if (card) {
                    visaPaymentDetails = {
                        cardName: card.cardName,
                        cardNumber: '**** **** **** ' + card.cardNumberLast4,
                        cardExpiry: card.expiryDate,
                        cardCvv: '***'
                    };
                }
            } else {
                visaPaymentDetails = {
                    cardName: formData.cardName,
                    cardNumber: formData.cardNumber.replace(/\s+/g, ''),
                    cardExpiry: formData.cardExpiry,
                    cardCvv: formData.cardCvv
                };
            }
        }

        const payload = {
            vehicle: selectedCar ? { carId: selectedCar._id, label: `${selectedCar.brand} ${selectedCar.model}` } : { type: formData.vehicle, label: selectedVehicleType?.label || 'Other' },
            services: fullServices.map(s => ({ code: s.id, name: s.name, price: s.price })),
            totalPrice: currentTotal,
            date: formData.date,
            time: formData.time,
            location: {
                area: formData.area,
                exactAddress: formData.exactAddress
            },
            paymentMethod: formData.paymentMethod,
            paymentDetails: visaPaymentDetails
        };

        setIsSubmitting(true);
        try {
            // Note: Adjusted endpoint for realistic Maghsaltak structure
            const response = await axios.post('http://localhost:8080/reservation', payload, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const createdBooking = response?.data?.data;
            if (createdBooking) {
                const existing = JSON.parse(localStorage.getItem('washBookings') || '[]');
                localStorage.setItem('washBookings', JSON.stringify([createdBooking, ...existing]));
            }

            window.dispatchEvent(new Event('auth-changed'));
            notify.success('Booking created successfully.');
            setStep(6);
        } catch (error) {
            notify.error(error?.response?.data?.message || 'Failed to create booking.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isStepValid = () => {
        if (step === 1) return formData.vehicle !== '';
        if (step === 2) {
            return formData.services.length > 0 && (formData.services.includes('interior') || formData.services.includes('exterior'));
        }
        if (step === 3) return formData.date !== '' && formData.time !== '';
        if (step === 4) return formData.area !== '' && formData.exactAddress.trim() !== '';
        if (step === 5) {
            if (formData.paymentMethod === 'visa') {
                if (formData.useSavedCard && formData.selectedSavedCardId && formData.selectedSavedCardId !== 'new') {
                    return true;
                }
                return formData.cardName.trim() !== '' && 
                       formData.cardNumber.replace(/\s/g, '').length >= 15 && 
                       formData.cardExpiry.length === 5 && 
                       formData.cardCvv.length >= 3;
            }
            return true;
        }
        return true;
    };

    const progressPercentage = ((step - 1) / 4) * 100;

    return (
        <div className="book-wash-page">
            <div className="book-wash-bg" aria-hidden="true">
                <div className="glow glow-1"></div>
                <div className="glow glow-2"></div>
            </div>

            <div className="glass-container">
                {step < 6 && (
                    <div className="progress-section">
                        <div className="progress-bar-bg">
                            <motion.div 
                                className="progress-bar-fill" 
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                        <div className="progress-steps-label">Step {step} of 5</div>
                    </div>
                )}

                <div className="step-viewport">
                    <AnimatePresence mode="wait">
                        {step === 1 && <StepVehicles key="1" formData={formData} updateForm={updateForm} myCars={myCars} />}
                        {step === 2 && <StepServices key="2" formData={formData} toggleService={toggleService} currentTotal={currentTotal} />}
                        {step === 3 && <StepSchedule key="3" formData={formData} updateForm={updateForm} bookedSlots={bookedSlots} />}
                        {step === 4 && <StepLocation key="4" formData={formData} updateForm={updateForm} />}
                        {step === 5 && <StepReview key="5" formData={formData} myCars={myCars} currentTotal={currentTotal} updateForm={updateForm} userData={userData} />}
                        {step === 6 && <StepSuccess key="6" navigate={navigate} />}
                    </AnimatePresence>
                </div>

                {step < 6 && (
                    <div className="form-actions">
                        {step > 1 ? (
                            <button className="book-btn-secondary" onClick={handlePrev}>
                                <ChevronLeft size={18} /> Back
                            </button>
                        ) : <div></div>}
                        
                        {step < 5 ? (
                            <button className="book-btn-primary" onClick={handleNext} disabled={!isStepValid()}>
                                Continue <ChevronRight size={18} />
                            </button>
                        ) : (
                            <button className="book-btn-primary checkout-btn" onClick={handleComplete} disabled={isSubmitting}>
                                {isSubmitting ? 'Confirming...' : <><CreditCard size={18} /> Confirm Booking</>}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookWash;