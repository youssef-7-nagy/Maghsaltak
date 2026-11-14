import React, { useState } from 'react';
import { FaCheck, FaArrowLeft } from 'react-icons/fa';
import './PackageCard.css';



const PackageCard = ({
  title,
  price,
  originalPrice,
  duration,
  features = [],
  isPopular,
  isSelected,
  onSelect,
  image,
  variant = 'basic',
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const discountAmount = originalPrice ? originalPrice - price : 0;

  return (
    <div
      className={`product-card product-card--${variant} ${isSelected ? 'product-card--selected' : ''} ${isFlipped ? 'product-card--flipped' : ''}`}
      onMouseLeave={() => setIsFlipped(false)}
    >
      <div className="product-card__content">

        {/* ═══════ FRONT FACE ═══════ */}
        <div className="product-card__face product-card__face--front">
          <div className="product-card__front-content">

            {/* Ambient orbs */}
            <div className="product-card__ambient">
              <div className="product-card__blob product-card__blob--one" />
              <div className="product-card__blob product-card__blob--two" />
              <div className="product-card__blob product-card__blob--three" />
            </div>

            {/* Top row — badges */}
            <div className="product-card__tags">
              {isPopular && <span className="product-card__popular">🔥 Most Popular</span>}
              {isSelected && <span className="product-card__selected">✓ Selected</span>}
            </div>

            {/* Package image */}
            {image && (
              <div className="product-card__photo-wrapper">
                <img src={image} alt={`${title} preview`} />
              </div>
            )}

            {/* Title */}
            <div className="product-card__title-wrap">
              <h3 className="product-card__title">
                {title}
              </h3>
            </div>

            {/* Price */}
            <div className="product-card__price-container">
              {originalPrice && (
                <div className="product-card__original-price-wrap">
                  <div className="product-card__original-price">
                    <span className="currency">EGP</span>{originalPrice}
                  </div>
                  <div className="product-card__discount-badge">
                    SAVE {discountAmount} EGP
                  </div>
                </div>
              )}
              <div className="product-card__price">
                <span className="currency">EGP</span>{price}
              </div>
            </div>

            {/* Duration pill */}
            <div className="product-card__duration">{duration}</div>

            {/* Hint */}
            <div className="product-card__hint">Hover · Flip · Explore</div>

            {/* CTA button */}
            <button
              className="product-card__flip-button"
              onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
            >
              View Details →
            </button>

          </div>
        </div>

        {/* ═══════ BACK FACE ═══════ */}
        <div className="product-card__face product-card__face--back">
          <div className="product-card__back-content">

            <div className="product-card__back-header">
              <h4>
                {title}
              </h4>
              {isPopular && <span>Best Value</span>}
            </div>

            <ul className="product-card__features">
              {features.length > 0 ? features.map((feat, i) => (
                <li key={i} style={{ '--item-index': i }}>
                  <div className="feature-icon-wrapper">
                    <FaCheck />
                  </div>
                  <span>{feat}</span>
                </li>
              )) : (
                <li style={{ '--item-index': 0 }}>
                  <div className="feature-icon-wrapper"><FaCheck /></div>
                  <span>Premium car wash service</span>
                </li>
              )}
            </ul>

            <div className="product-card__actions">
              <button
                className="product-card__back-button"
                onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
              >
                <FaArrowLeft /> Back
              </button>
              <button
                className="product-card__select-button"
                onClick={(e) => { e.stopPropagation(); onSelect(); }}
              >
                {isSelected ? '✓ Selected' : 'Select Plan'}
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default PackageCard;