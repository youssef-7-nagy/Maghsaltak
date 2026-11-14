import React, { useState, useEffect } from 'react';
import './CarCard.css';
import { getBrandLogoUrl } from '../utils/logoHelper';

const CarCard = ({ car, onDelete }) => {
    const [imgError, setImgError] = useState(false);
    
    if (!car) return null; 
    
    const actualBrand = car.brand || car.make || 'Unknown';
    const actualModel = car.model || '';
    
    const initials = `${actualBrand.charAt(0) || '?'}`.toUpperCase();
    const logoUrl = getBrandLogoUrl(actualBrand);

    // Reset the error state if the car brand changes
    useEffect(() => {
        setImgError(false);
    }, [logoUrl]);

    const carColor = car.color || '#1A1A1A';

    const getCategoryClass = (type) => {
        const t = (type || '').toLowerCase();
        if (t.includes('suv')) return 'type-suv';
        if (t.includes('sedan')) return 'type-sedan';
        if (t.includes('hatchback')) return 'type-hatchback';
        if (t.includes('truck') || t.includes('pickup')) return 'type-truck';
        if (t.includes('coupe') || t.includes('sport')) return 'type-coupe';
        return 'type-standard';
    };

    const getCategoryIcon = (type) => {
        const t = (type || '').toLowerCase();
        if (t.includes('suv')) return '🚙 ';
        if (t.includes('sedan')) return '🚗 ';
        if (t.includes('hatchback')) return '🚘 ';
        if (t.includes('truck') || t.includes('pickup')) return '🛻 ';
        if (t.includes('coupe') || t.includes('sport')) return '🏎️ ';
        return '🚙 ';
    };

    return (
        <div className="car-card">
            <div className="car-card-stripe" style={{ background: carColor }} />

            <div className="car-card-body">
                <div className="car-card-left">
                    <div 
                        className={`car-color-badge ${logoUrl && !imgError ? 'has-logo' : ''}`} 
                        style={{ background: logoUrl && !imgError ? '#ffffff' : carColor }}
                    >
                        {logoUrl && !imgError ? (
                            <img 
                                src={logoUrl} 
                                alt={`${actualBrand} logo`} 
                                className="brand-logo"
                                onError={(e) => {
                                    // If the local file is missing, fallback to initials and log a helpful warning
                                    console.warn(`🖼️ Missing Logo: Please add an image at "public${new URL(e.target.src).pathname}"`);
                                    setImgError(true);
                                }} 
                            />
                        ) : (
                            <span className="car-badge-initial">{initials}</span>
                        )}
                    </div>
                    
                    <div className="car-info">
                        <h4 className="car-name">{actualBrand} {actualModel}</h4>
                        <div className="car-meta-row">
                            <span className="car-meta-chip year">{car.year || 'N/A'}</span>
                            <span className={`car-meta-chip type ${getCategoryClass(car.type)}`}>
                                {getCategoryIcon(car.type)}{car.type || 'Standard'}
                            </span>
                        </div>
                        <span className="car-plate">🪪 {car.plateNumber || 'No Plate'}</span>
                    </div>
                </div>

                {onDelete && (
                    <button
                        className="btn-delete-car"
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            onDelete(car._id); 
                        }}
                        title="Remove car"
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>
    );
};

export default CarCard;