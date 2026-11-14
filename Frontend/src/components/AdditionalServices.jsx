import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './AdditionalServices.css';

// Import requested assets
import brakeDiskImg from '../assets/Brake disk.png';
import oilImg from '../assets/oil.png';
import airFilterImg from '../assets/air filter.png';
import tierImg from '../assets/tier.png';
import oilFilterImg from '../assets/oil filter.png';
import headGasketImg from '../assets/aaaa.png';

const services = [
  { id: 1, title: 'Brake Disk', img: brakeDiskImg, imgClass: 'img-normal' },
  { id: 2, title: 'Motor Oil', img: oilImg, imgClass: 'img-normal' },
  { id: 3, title: 'Air Filter', img: airFilterImg, imgClass: 'img-airfilter' },
  { id: 4, title: 'Tires', img: tierImg, imgClass: 'img-normal' },
  { id: 5, title: 'Oil Filter', img: oilFilterImg, imgClass: 'img-normal' },
  { id: 6, title: 'Head Gasket', img: headGasketImg, imgClass: 'img-normal' },
];

const AdditionalServices = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardsToShow, setCardsToShow] = useState(4);

  // Handle responsiveness
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCardsToShow(1);
      } else if (window.innerWidth < 1024) {
        setCardsToShow(2);
      } else {
        setCardsToShow(4);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const nextSlide = () => {
    if (currentIndex < services.length - cardsToShow) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0); // loop back
    }
  };

  const prevSlide = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      setCurrentIndex(services.length - cardsToShow); // loop to end
    }
  };

  return (
    <section className="home-section additional-services-section home-reveal is-visible" id="section-6">

      <div className="section-content">
        <div className="additional-services-header slide-up-1">
          <span className="premium-badge">Automotive Excellence</span>
          <h2 className="services-title">Premium Parts & Maintenance</h2>
        </div>

        <div className="services-slider-container slide-up-2">
          {/* Previous Button */}
          <button className="slider-btn prev-btn" onClick={prevSlide} aria-label="Previous service">
            <ChevronLeft size={32} strokeWidth={2.5} />
          </button>

          <div className="slider-view">
            <div
              className="slider-track"
              style={{ transform: `translateX(-${currentIndex * (100 / cardsToShow)}%)` }}
            >
              {services.map((service) => (
                <div
                  key={service.id}
                  className="slider-card-wrapper"
                  style={{ flex: `0 0 ${100 / cardsToShow}%` }}
                >
                  {/* Water-Themed Neumorphic Card */}
                  <div className="service-card">
                    {/* Items are now INSIDE the card completely */}
                    <div className="service-img-container">
                      <img src={service.img} alt={service.title} className={`service-img ${service.imgClass}`} />
                    </div>

                    <div className="service-info">
                      <h3 className="service-card-title">{service.title}</h3>
                      <div className="service-accent-line"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Next Button */}
          <button className="slider-btn next-btn" onClick={nextSlide} aria-label="Next service">
            <ChevronRight size={32} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default AdditionalServices;
