import React, { useState } from 'react';
import './AddCardModal.css';
import { ChipSvg, ContactlessSvg } from '../assets/cardIcons.jsx';

const CARD_TYPES = [
    { value: 'visa', label: 'Visa', logo: 'VISA', bg: '#1a1f36' },
    { value: 'mastercard', label: 'Mastercard', logo: 'MASTER', bg: '#ff5f00' },
    { value: 'meeza', label: 'Meeza', logo: 'MEEZA', bg: '#00539c' }
];

const AddCardModal = ({ isOpen, onClose, onAddCard }) => {
    const [step, setStep] = useState(1);
    const [cardData, setCardData] = useState({
        cardType: 'visa',
        cardName: '',
        cardNumber: '',
        expiryDate: '',
        cvv: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cardFlipped, setCardFlipped] = useState(false);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'cardNumber') {
            // only allow digits and format with spaces every 4 digits
            let val = value.replace(/\D/g, '');
            if (val.length > 16) val = val.substring(0, 16);
            const formatted = val.replace(/(\d{4})/g, '$1 ').trim();
            setCardData(prev => ({ ...prev, [name]: formatted }));
        } else if (name === 'expiryDate') {
            // MM/YY format
            let val = value.replace(/\D/g, '');
            if (val.length > 4) val = val.substring(0, 4);
            if (val.length > 2) {
                val = `${val.substring(0, 2)}/${val.substring(2)}`;
            }
            setCardData(prev => ({ ...prev, [name]: val }));
        } else if (name === 'cvv') {
            let val = value.replace(/\D/g, '');
            if (val.length > 3) val = val.substring(0, 3);
            setCardData(prev => ({ ...prev, [name]: val }));
        } else {
            setCardData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleReset = () => {
        setCardData({ cardType: 'visa', cardName: '', cardNumber: '', expiryDate: '', cvv: '' });
        setStep(1);
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        await onAddCard(cardData);
        setIsSubmitting(false);
        handleReset();
        onClose();
    };

    const isStep1Valid = cardData.cardType !== '';
    const isStep2Valid = cardData.cardName.trim() !== '' && cardData.cardNumber.replace(/\s/g, '').length === 16;
    const isStep3Valid = cardData.expiryDate.length === 5 && cardData.cvv.length === 3;

    return (
        <div style={S.overlay} onClick={handleClose}>
            <div style={S.panel} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={S.header}>
                    <div>
                        <p style={S.headerLabel}>NEW PAYMENT METHOD</p>
                        <h2 style={S.headerTitle}>Add Saved Card</h2>
                    </div>
                    <button onClick={handleClose} style={S.closeBtn} aria-label="Close">✕</button>
                </div>

                {/* Step Indicator */}
                <div style={S.steps}>
                    {['Network', 'Details', 'Security'].map((label, i) => {
                        const num = i + 1;
                        const isActive = step === num;
                        const isDone = step > num;
                        return (
                            <React.Fragment key={num}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                    <div style={{
                                        ...S.stepDot,
                                        background: isDone ? '#22c55e' : isActive ? '#6366f1' : '#e2e8f0',
                                        color: isDone || isActive ? '#fff' : '#94a3b8',
                                        boxShadow: isActive ? '0 0 0 4px rgba(99,102,241,0.15)' : 'none'
                                    }}>
                                        {isDone ? '✔' : num}
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? '#6366f1' : isDone ? '#22c55e' : '#94a3b8', letterSpacing: 0.5 }}>{label}</span>
                                </div>
                                {i < 2 && <div style={{ ...S.stepLine, background: isDone ? '#22c55e' : '#e2e8f0' }} />}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* STEP 1 — Card Network */}
                {step === 1 && (
                    <div style={{ animation: 'fadeSlide 0.3s ease' }}>
                        <p style={S.stepQuestion}>Choose your card network</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {CARD_TYPES.map(ct => (
                                <button
                                    key={ct.value}
                                    type="button"
                                    onClick={() => setCardData(prev => ({ ...prev, cardType: ct.value }))}
                                    style={{
                                        ...S.typeCard,
                                        borderColor: cardData.cardType === ct.value ? '#6366f1' : '#e2e8f0',
                                        background: cardData.cardType === ct.value ? '#eef2ff' : '#fff',
                                        boxShadow: cardData.cardType === ct.value ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none'
                                    }}
                                >
                                    <div style={{
                                        width: 48, height: 32, borderRadius: 6, background: ct.bg,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#fff', fontWeight: 800, fontSize: 10, letterSpacing: 1
                                    }}>
                                        {ct.logo}
                                    </div>
                                    <div style={{ textAlign: 'left', flex: 1 }}>
                                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>{ct.label}</div>
                                    </div>
                                    {cardData.cardType === ct.value && <span style={{ color: '#6366f1', fontSize: 18 }}>✓</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 2 — Card Name & Number */}
                {step === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeSlide 0.3s ease' }}>
                        <p style={S.stepQuestion}>Enter the card details</p>
                        
                        <div style={S.fieldGroup}>
                            <label style={S.label}>Name on Card</label>
                            <input
                                name="cardName" value={cardData.cardName} onChange={handleChange}
                                placeholder="JOHN DOE" required style={{...S.input, textTransform: 'uppercase'}}
                                onFocus={() => setCardFlipped(false)}
                            />
                        </div>
                        
                        <div style={S.fieldGroup}>
                            <label style={S.label}>Card Number</label>
                            <input
                                name="cardNumber" value={cardData.cardNumber} onChange={handleChange}
                                placeholder="0000 0000 0000 0000" required style={{...S.input, letterSpacing: 2, fontFamily: 'monospace', fontSize: 16}}
                                onFocus={() => setCardFlipped(false)}
                            />
                        </div>

                        {/* Interactive Preview using the Flip Card design */}
                        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                            <div className={`flip-card ${cardFlipped ? 'flipped' : ''}`} style={{ transform: 'scale(1.15)', transformOrigin: 'top center', marginBottom: 20 }}>
                                <div className="flip-card-inner">
                                    <div className="flip-card-front">
                                        <p className="heading_8264">{CARD_TYPES.find(c => c.value === cardData.cardType)?.label?.toUpperCase() || 'MASTERCARD'}</p>
                                        
                                        {/* Dynamic Logo Based on Type */}
                                        <div className="logo" style={{ top: '6.8em', left: '11.7em', position: 'absolute' }}>
                                            {cardData.cardType === 'mastercard' && (
                                                <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="36" height="36" viewBox="0 0 48 48">
                                                    <path fill="#ff9800" d="M32 10A14 14 0 1 0 32 38A14 14 0 1 0 32 10Z"></path><path fill="#d50000" d="M16 10A14 14 0 1 0 16 38A14 14 0 1 0 16 10Z"></path><path fill="#ff3d00" d="M18,24c0,4.755,2.376,8.95,6,11.48c3.624-2.53,6-6.725,6-11.48s-2.376-8.95-6-11.48 C20.376,15.05,18,19.245,18,24z"></path>
                                                </svg>
                                            )}
                                            {cardData.cardType === 'visa' && (
                                                <span style={{ fontFamily: 'Arial', fontStyle: 'italic', fontWeight: 900, fontSize: '24px', letterSpacing: '-1px', color: '#fff' }}>VISA</span>
                                            )}
                                            {cardData.cardType === 'meeza' && (
                                                <span style={{ fontWeight: 800, fontSize: '20px', letterSpacing: '1px', color: '#fff' }}>MEEZA</span>
                                            )}
                                        </div>

                                        <ChipSvg />
                                        <ContactlessSvg />
                                        <p className="number">{cardData.cardNumber || "#### #### #### ####"}</p>
                                        <p className="valid_thru">VALID THRU</p>
                                        <p className="date_8264">{cardData.expiryDate || "MM/YY"}</p>
                                        <p className="name">{cardData.cardName || "CARDHOLDER NAME"}</p>
                                    </div>
                                    <div className="flip-card-back">
                                        <div className="strip"></div>
                                        <div className="mstrip"></div>
                                        <div className="sstrip">
                                            <p className="code">{cardData.cvv || "***"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 3 — Expiry & Security */}
                {step === 3 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeSlide 0.3s ease' }}>
                        <p style={S.stepQuestion}>Almost ready to use!</p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div style={S.fieldGroup}>
                                <label style={S.label}>Expiry Date</label>
                                <input
                                    name="expiryDate" value={cardData.expiryDate} onChange={handleChange}
                                    placeholder="MM/YY" required style={{...S.input, letterSpacing: 2, textAlign: 'center'}}
                                    onFocus={() => setCardFlipped(false)}
                                />
                            </div>
                            <div style={S.fieldGroup}>
                                <label style={S.label}>CVV / CVC</label>
                                <input
                                    type="password" name="cvv" value={cardData.cvv} onChange={handleChange}
                                    placeholder="***" required style={{...S.input, letterSpacing: 4, textAlign: 'center'}}
                                    onFocus={() => setCardFlipped(true)}
                                    onBlur={() => setCardFlipped(false)}
                                />
                            </div>
                        </div>
                        <p style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 8 }}>
                            🔒 We encrypt your card information. Your CVV is never stored.
                        </p>
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
                            {isSubmitting ? 'Saving...' : '✔ Add Card'}
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
    headerLabel: { margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: '#6366f1', textTransform: 'uppercase' },
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
    footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
    backBtn: {
        background: 'none', border: '2px solid #e2e8f0', color: '#475569',
        padding: '10px 20px', borderRadius: 10, cursor: 'pointer',
        fontWeight: 700, fontSize: 14, transition: 'all 0.2s'
    },
    nextBtn: {
        background: '#6366f1', color: '#fff', border: 'none',
        padding: '11px 24px', borderRadius: 10, cursor: 'pointer',
        fontWeight: 700, fontSize: 14, transition: 'all 0.2s',
        boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
    }
};

export default AddCardModal;
