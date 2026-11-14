import React, { useState, useEffect } from 'react';
import { BRAND_LIST, getBrandLogoUrl } from '../utils/logoHelper';

const VEHICLE_TYPES = [
    { value: 'Sedan', icon: '🚗', desc: 'Classic saloon car' },
    { value: 'SUV', icon: '🚙', desc: 'Sport utility vehicle' },
    { value: 'Hatchback', icon: '🚘', desc: 'Compact with rear door' },
];

const PRESET_COLORS = [
    { label: 'Pearl White', hex: '#F5F5F5' },
    { label: 'Jet Black', hex: '#1A1A1A' },
    { label: 'Silver', hex: '#C0C0C0' },
    { label: 'Midnight Blue', hex: '#1B3A6B' },
    { label: 'Racing Red', hex: '#C0392B' },
    { label: 'Charcoal', hex: '#4A4A4A' },
    { label: 'Desert Gold', hex: '#C9A84C' },
    { label: 'Forest Green', hex: '#2D6A4F' },
];


const AddCarModal = ({ isOpen, onClose, onAddCar }) => {
    const [step, setStep] = useState(1);
    const [carData, setCarData] = useState({
        type: '',
        brand: '',
        model: '',
        year: '',
        color: '#1A1A1A',
        licensePlate: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        setImgError(false);
    }, [carData.brand]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCarData(prev => ({ ...prev, [name]: value }));
    };

    const handleReset = () => {
        setCarData({ type: '', brand: '', model: '', year: '', color: '#1A1A1A', licensePlate: '' });
        setStep(1);
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        await onAddCar({
            type: carData.type,
            brand: carData.brand,
            model: carData.model,
            year: carData.year,
            color: carData.color,
            plateNumber: carData.licensePlate
        });
        setIsSubmitting(false);
        handleReset();
        onClose();
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: currentYear - 1989 }, (_, i) => currentYear + 1 - i);

    const isStep1Valid = carData.type !== '';
    const isStep2Valid = carData.brand !== '' && carData.model !== '' && carData.year !== '';
    const isStep3Valid = carData.color !== '' && carData.licensePlate !== '';
    
    const logoUrl = getBrandLogoUrl(carData.brand);

    return (
        <div style={S.overlay} onClick={handleClose}>
            <div style={S.panel} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={S.header}>
                    <div>
                        <p style={S.headerLabel}>NEW VEHICLE</p>
                        <h2 style={S.headerTitle}>Add Your Car</h2>
                    </div>
                    <button onClick={handleClose} style={S.closeBtn} aria-label="Close">✕</button>
                </div>

                {/* Step Indicator */}
                <div style={S.steps}>
                    {['Type', 'Details', 'Finish'].map((label, i) => {
                        const num = i + 1;
                        const isActive = step === num;
                        const isDone = step > num;
                        return (
                            <React.Fragment key={num}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                    <div style={{
                                        ...S.stepDot,
                                        background: isDone ? '#22c55e' : isActive ? '#0284c7' : '#e2e8f0',
                                        color: isDone || isActive ? '#fff' : '#94a3b8',
                                        boxShadow: isActive ? '0 0 0 4px rgba(2,132,199,0.15)' : 'none'
                                    }}>
                                        {isDone ? '✓' : num}
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? '#0284c7' : isDone ? '#22c55e' : '#94a3b8', letterSpacing: 0.5 }}>{label}</span>
                                </div>
                                {i < 2 && <div style={{ ...S.stepLine, background: isDone ? '#22c55e' : '#e2e8f0' }} />}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* STEP 1 — Vehicle Type */}
                {step === 1 && (
                    <div style={{ animation: 'fadeSlide 0.3s ease' }}>
                        <p style={S.stepQuestion}>What type of vehicle do you drive?</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {VEHICLE_TYPES.map(vt => (
                                <button
                                    key={vt.value}
                                    type="button"
                                    onClick={() => setCarData(prev => ({ ...prev, type: vt.value }))}
                                    style={{
                                        ...S.typeCard,
                                        borderColor: carData.type === vt.value ? '#0284c7' : '#e2e8f0',
                                        background: carData.type === vt.value ? '#f0f9ff' : '#fff',
                                        boxShadow: carData.type === vt.value ? '0 0 0 3px rgba(2,132,199,0.12)' : 'none'
                                    }}
                                >
                                    <span style={{ fontSize: 28 }}>{vt.icon}</span>
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>{vt.value}</div>
                                        <div style={{ fontSize: 12, color: '#64748b' }}>{vt.desc}</div>
                                    </div>
                                    {carData.type === vt.value && <span style={{ marginLeft: 'auto', color: '#0284c7', fontSize: 18 }}>✓</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 2 — Brand, Model, Year */}
                {step === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeSlide 0.3s ease' }}>
                        <p style={S.stepQuestion}>Tell us about the car.</p>
                        <div style={S.fieldGroup}>
                            <label style={S.label}>Brand</label>
                            <select name="brand" value={carData.brand} onChange={handleChange} required style={S.select}>
                                <option value="" disabled>Select brand...</option>
                                {BRAND_LIST.map((b, i) => <option key={i} value={b}>{b}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div style={S.fieldGroup}>
                                <label style={S.label}>Model</label>
                                <input
                                    name="model" value={carData.model} onChange={handleChange}
                                    placeholder="e.g. Corolla" required style={S.input}
                                />
                            </div>
                            <div style={S.fieldGroup}>
                                <label style={S.label}>Year</label>
                                <select name="year" value={carData.year} onChange={handleChange} required style={S.select}>
                                    <option value="" disabled>Year...</option>
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 3 — Color & Plate */}
                {step === 3 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeSlide 0.3s ease' }}>
                        <p style={S.stepQuestion}>Last details — almost done!</p>

                        {/* Color Swatches */}
                        <div style={S.fieldGroup}>
                            <label style={S.label}>Car Color</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
                                {PRESET_COLORS.map(pc => (
                                    <button
                                        key={pc.hex}
                                        type="button"
                                        title={pc.label}
                                        onClick={() => setCarData(prev => ({ ...prev, color: pc.hex }))}
                                        style={{
                                            width: 34, height: 34, borderRadius: '50%',
                                            backgroundColor: pc.hex,
                                            border: carData.color === pc.hex ? '3px solid #0284c7' : '2px solid #e2e8f0',
                                            cursor: 'pointer', boxShadow: carData.color === pc.hex ? '0 0 0 2px #fff, 0 0 0 4px #0284c7' : '0 1px 3px rgba(0,0,0,0.15)',
                                            transition: 'all 0.2s'
                                        }}
                                    />
                                ))}
                                {/* Custom color picker fallback */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <input
                                        type="color" name="color" value={carData.color} onChange={handleChange}
                                        title="Custom color"
                                        style={{ width: 34, height: 34, borderRadius: '50%', border: '2px solid #e2e8f0', cursor: 'pointer', padding: 2 }}
                                    />
                                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{carData.color.toUpperCase()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Preview pill */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                            <div style={{ 
                                width: 36, height: 36, borderRadius: 8, background: carData.color, 
                                boxShadow: 'inset 0 -2px 5px rgba(0,0,0,0.2)', display: 'flex', 
                                alignItems: 'center', justifyContent: 'center', overflow: 'hidden' 
                            }}>
                                {logoUrl && !imgError && carData.brand ? (
                                    <img 
                                        src={logoUrl} 
                                        alt={carData.brand} 
                                        style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#ffffff', padding: 4 }}
                                        onError={(e) => {
                                            console.warn(`🖼️ Missing Logo: Please add an image at "public${new URL(e.target.src).pathname}"`);
                                            setImgError(true);
                                        }}
                                    />
                                ) : (
                                    <span style={{ fontSize: 18, color: '#fff', fontWeight: 900, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                        {carData.brand ? carData.brand.charAt(0).toUpperCase() : '🚘'}
                                    </span>
                                )}
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{carData.year} {carData.brand} {carData.model}</div>
                                <div style={{ fontSize: 12, color: '#64748b' }}>{carData.type}</div>
                            </div>
                        </div>

                        {/* Plate */}
                        <div style={S.fieldGroup}>
                            <label style={S.label}>License Plate</label>
                            <input
                                name="licensePlate" value={carData.licensePlate} onChange={handleChange}
                                placeholder="e.g. أ ب ج 123" required style={{ ...S.input, textAlign: 'center', letterSpacing: 2, fontWeight: 700, fontSize: 16 }}
                            />
                        </div>
                    </div>
                )}

                {/* Footer Navigation */}
                <div style={S.footer}>
                    {step > 1 ? (
                        <button type="button" onClick={() => setStep(s => s - 1)} style={S.backBtn}>← Back</button>
                    ) : (
                        <span />
                    )}

                    {step < 3 ? (
                        <button
                            type="button"
                            onClick={() => setStep(s => s + 1)}
                            disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)}
                            style={{ ...S.nextBtn, opacity: (step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid) ? 0.4 : 1 }}
                        >
                            Continue →
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!isStep3Valid || isSubmitting}
                            style={{ ...S.nextBtn, background: '#22c55e', opacity: (!isStep3Valid || isSubmitting) ? 0.4 : 1 }}
                        >
                            {isSubmitting ? 'Saving...' : '✓ Save Car'}
                        </button>
                    )}
                </div>

                <style>{`
                    @keyframes fadeSlide {
                        from { opacity: 0; transform: translateX(12px); }
                        to { opacity: 1; transform: translateX(0); }
                    }
                `}</style>
            </div>
        </div>
    );
};

const S = {
    overlay: {
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(10, 15, 30, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16
    },
    panel: {
        background: '#fff', borderRadius: 24,
        width: '100%', maxWidth: 460,
        boxShadow: '0 25px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)',
        padding: '32px 28px', maxHeight: '92vh', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 24
    },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
    headerLabel: { margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: '#0284c7', textTransform: 'uppercase' },
    headerTitle: { margin: '4px 0 0', fontSize: 22, fontWeight: 800, color: '#0f172a' },
    closeBtn: {
        background: '#f1f5f9', border: 'none', borderRadius: '50%',
        width: 36, height: 36, cursor: 'pointer', fontSize: 14,
        color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.2s'
    },
    steps: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
    stepDot: {
        width: 32, height: 32, borderRadius: '50%', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700,
        transition: 'all 0.3s ease'
    },
    stepLine: { flex: 1, height: 3, borderRadius: 2, maxWidth: 60, transition: 'background 0.3s ease' },
    stepQuestion: { margin: 0, fontSize: 14, color: '#64748b', fontWeight: 500 },
    typeCard: {
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '14px 18px', borderRadius: 14, border: '2px solid #e2e8f0',
        cursor: 'pointer', textAlign: 'left', width: '100%',
        transition: 'all 0.2s ease', background: '#fff'
    },
    fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
    label: { fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.6 },
    input: {
        padding: '11px 14px', borderRadius: 10, border: '2px solid #e2e8f0',
        fontSize: 14, color: '#0f172a', outline: 'none', width: '100%',
        boxSizing: 'border-box', background: '#f8fafc', fontFamily: 'inherit',
        transition: 'border-color 0.2s'
    },
    select: {
        padding: '11px 14px', borderRadius: 10, border: '2px solid #e2e8f0',
        fontSize: 14, color: '#0f172a', outline: 'none', width: '100%',
        boxSizing: 'border-box', background: '#f8fafc', fontFamily: 'inherit',
        cursor: 'pointer', appearance: 'auto'
    },
    footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
    backBtn: {
        background: 'none', border: '2px solid #e2e8f0', color: '#475569',
        padding: '10px 20px', borderRadius: 10, cursor: 'pointer',
        fontWeight: 700, fontSize: 14, transition: 'all 0.2s'
    },
    nextBtn: {
        background: '#0284c7', color: '#fff', border: 'none',
        padding: '11px 24px', borderRadius: 10, cursor: 'pointer',
        fontWeight: 700, fontSize: 14, transition: 'all 0.2s',
        boxShadow: '0 4px 12px rgba(2,132,199,0.3)'
    }
};

export default AddCarModal;