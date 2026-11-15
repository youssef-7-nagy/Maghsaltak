import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Users, ArrowLeftRight, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import './Home.css';
import AdditionalServices from '../components/AdditionalServices';

// IMPORT YOUR PHOTOS HERE
import beforeImg from '../assets/Unclean.jpg';
import afterImg from '../assets/clean.jpg';
import carfarImg from '../assets/Carfar.PNG';
import section5Img from '../assets/section5.png';
import heroCarImg from '../assets/14.png';
import img22 from '../assets/22.jpg';
import img23 from '../assets/23.jpg';
import img24 from '../assets/24.jpg';
import img21 from '../assets/21.jpg';
import img25 from '../assets/35.jpg';
import navLogo from '../assets/BackgroundRemover.png';
import washerImg from '../assets/washer.png';
import carwashImg from '../assets/carwash.jpg';
import cleannnImg from '../assets/cleannn.png';
import makhsaltakImg from '../assets/Makhsaltak.jpg';
import cartoImg from '../assets/carto.jpg';

const API = 'http://localhost:8080';

/* ── Seeded random for stable particle positions ── */
const seededRand = (seed) => {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

const Home = () => {
  const navigate = useNavigate();
  const [sliderPosition, setSliderPosition] = useState(50);

  const handleSliderChange = (event) => {
    setSliderPosition(event.target.value);
  };


  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.15,
    };

    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.home-reveal');
    revealElements.forEach((el) => observer.observe(el));

    return () => {
      revealElements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  /* Water-rain particles — stable across renders */
  const rainDrops = useMemo(() => {
    const rand = seededRand(99);
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: rand() * 100,
      delay: rand() * 4,
      duration: 1.1 + rand() * 2,
      size: 1.5 + rand() * 4,
      opacity: 0.18 + rand() * 0.45,
    }));
  }, []);

  /* Spray particles for the washer nozzle */
  const sprayParticles = useMemo(() => {
    const rand = seededRand(55);
    return Array.from({ length: 16 }, (_, i) => ({
      id: i,
      spread: (rand() - 0.5) * 55,
      distance: 40 + rand() * 85,
      delay: rand() * 0.8,
      duration: 0.5 + rand() * 0.55,
      size: 3 + rand() * 5,
    }));
  }, []);

  return (
    <div className="home-page">

      {/* SECTION 0: Full Screen Splash */}
      <section className="home-section splash-screen-section" id="section-0">
        <div className="splash-image-wrapper">
          <img src="/homi/design.jpg" alt="Maghsaltak Splash" className="splash-fullscreen-img" />
          
          <div className="splash-overlay-content">
             <img src="/homi/go.png" alt="Car overlay" className="splash-car-overlay" />
          </div>
        </div>
      </section>

      {/* SECTION 1: Skewed Panels Hero */}
      <section className="home-section hero-section home-reveal is-visible" id="section-1">
        <div className="section-content new-hero-content">
          {/* Skewed panels on top */}
          <div className="skewed-panels-container">
            {[img22, img23, img24, img21, img25].map((imgSrc, index) => (
              <div key={index} className="skewed-panel">
                <div className="skewed-panel-inner">
                  <img src={imgSrc} alt={`Gallery ${index + 1}`} />
                </div>
              </div>
            ))}
          </div>

          {/* Car image cleanly seated below panels */}
          <div className="hero-car-display">
            {/* Background text appropriately scaled to stretch behind the car */}
            <div className="hero-bg-text text-behind" aria-hidden="true">
              <span>M</span><span>a</span><span>g</span><span>h</span><span>s</span><span>a</span><span>l</span><span>t</span><span>a</span><span>k</span>
            </div>
            <div className="hero-bg-text text-in-front" aria-hidden="true">
              <span className="hide-text">M</span><span className="hide-text">a</span><span className="hide-text">g</span><span>h</span><span>s</span><span>a</span><span className="hide-text">l</span><span className="hide-text">t</span><span className="hide-text">a</span><span className="hide-text">k</span>
            </div>
            <div className="loader"></div>
            <img src={heroCarImg} alt="Hero Car" className="main-hero-car" />
          </div>
        </div>
      </section>

      {/* SECTION 2: Mobile Car Wash Project */}
      <section className="home-section alt-bg home-reveal section-2-enhanced" id="section-2">
        <div className="section-2-background-glow"></div>
        <div className="section-content mission-grid section-2-grid">
          <div className="mission-content slide-up-1 section-2-content-cool">
            <div className="cool-typo-container">
              <h2 className="cool-typo-heading">
                <span className="cool-typo-line-1">NO TIME TO</span>
                <div className="cool-typo-line-2">
                  <span className="cool-typo-wash">WASH?</span>
                  <div className="cool-typo-leave-block">
                    <span className="cool-typo-leave">LEAVE IT</span>
                    <span className="cool-typo-to-us">TO US.</span>
                  </div>
                </div>
              </h2>
              <button className="liquid-button" onClick={() => navigate('/book-wash')}>
                <span className="liquid"></span>
                <span className="btn-txt">Book A Wash</span>
              </button>
            </div>
          </div>
          <div className="carfar-image-container slide-up-2 section-2-image-wrapper">
            <div className="image-glow-effect"></div>
            <img
              src={carfarImg}
              alt="Carfar Mobile Detailing"
              className="carfar-image section-2-image"
            />
            <div className="image-shine-effect"></div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Mission & Interactive Slider */}
      <section className="home-section home-reveal" id="section-3">
        <div className="section-content mission-grid">
          <div className="mission-image before-after-container slide-up-1">
            <img
              src={afterImg}
              alt="Clean Car"
              className="slider-image image-after"
            />
            <img
              src={beforeImg}
              alt="Dirty Car"
              className="slider-image image-before"
              style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
            />
            <div className="slider-line" style={{ left: `${sliderPosition}%` }}>
              <div className="slider-button">
                <ArrowLeftRight size={20} />
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={handleSliderChange}
              className="slider-input"
            />
          </div>

          <div className="mission-content slide-up-2">
            <h2>More Than Just a Car Wash</h2>
            <p className="mission-intro">
              We believe your vehicle is an extension of you. That's why we don't just wash cars; we rejuvenate them. Our team of certified professionals uses industry-leading techniques and eco-friendly products to ensure your car gets the treatment it deserves.
            </p>
            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon"><Target size={24} /></div>
                <div className="feature-text">
                  <h4>Our Mission</h4>
                  <p>To provide unparalleled convenience without compromising on quality, saving you time while protecting your investment.</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon"><Users size={24} /></div>
                <div className="feature-text">
                  <h4>Our Team</h4>
                  <p>Passionate detailers who treat every vehicle as if it were their own, trained in the latest paint-safe washing methods.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Gallery Snapshot Section */}
      <section className="home-section gallery-section home-reveal" id="section-4">
        <div className="section-content">

          <div className="gallery-header slide-up-1">
            <h2 className="gallery-title">
              HAVE A LOOK AT<br />
              OUR CAR WASHES
            </h2>
            <p className="gallery-desc">
              Can explore now a variety of snapshots showcasing our comprehensive range of services.
            </p>
          </div>

          <div className="gallery-grid slide-up-2">
            <div className="gallery-item">
              <img src={img21} alt="Car wash bay" />
            </div>
            <div className="gallery-item">
              <img src={carwashImg} alt="Car wash service" />
            </div>
            <div className="gallery-item">
              <img src={makhsaltakImg} alt="Maghsaltak team" />
            </div>
            <div className="gallery-item">
              <img src={cartoImg} alt="Car detailing" />
            </div>
          </div>

          <div className="gallery-footer slide-up-1">
            <button className="btn-join-today" onClick={() => navigate('/book-wash')}>Book Today</button>
          </div>

        </div>
      </section>

      {/* SECTION 5: Premium Detailing Showcase */}
      <section className="home-section premium-section home-reveal" id="section-5">
        <div className="section-content mission-grid">
          <div className="premium-content slide-up-1">
            <h2 className="premium-title">Ultimate Protection & Shine</h2>
            <p className="premium-intro">
              Elevate your vehicle's aesthetic with our premium detailing and ceramic coating services. We go beyond the surface to restore, enhance, and protect your paintwork against the elements.
            </p>
            <ul className="premium-benefits">
              <li>
                <span className="check-mark">✓</span> Engine Wash
              </li>
              <li>
                <span className="check-mark">✓</span> Deep Interior Clean
              </li>
              <li>
                <span className="check-mark">✓</span> Premium Exterior Wash
              </li>
              <li>
                <span className="check-mark">✓</span> Wheel & Tire Detailing
              </li>
              <li>
                <span className="check-mark">✓</span> Exhaust & Rear Wash
              </li>
            </ul>
            <button className="btn-primary-cut btn-cyan mt-4" onClick={() => navigate('/packages')}>Explore Our Packages</button>
          </div>

          <div className="premium-image-container slide-up-2">
            <div className="glow-backdrop"></div>

            <div className="premium-image-wrapper">
              <img
                src={section5Img}
                alt="Premium Car Top Down View"
                className="premium-car-image"
              />

              {/* 1. Engine Hint (Points Right) */}
              <div className="item-hints hint-engine">
                <div className="hint" data-position="4">
                  <span className="hint-radius"></span>
                  <span className="hint-dot">Tip</span>
                  <div className="hint-content do--split-children">
                    <p>Engine Wash</p>
                  </div>
                </div>
              </div>

              {/* 2. Interior Hint (Points Right) */}
              <div className="item-hints hint-interior">
                <div className="hint" data-position="4">
                  <span className="hint-radius"></span>
                  <span className="hint-dot">Tip</span>
                  <div className="hint-content do--split-children">
                    <p>Deep Interior Clean</p>
                  </div>
                </div>
              </div>

              {/* 3. Exterior Hint (Now points LEFT using position 3) */}
              <div className="item-hints hint-exterior">
                <div className="hint" data-position="3">
                  <span className="hint-radius"></span>
                  <span className="hint-dot">Tip</span>
                  <div className="hint-content do--split-children">
                    <p>Premium Exterior Wash</p>
                  </div>
                </div>
              </div>

              {/* 4. Tires Hint (Points Right) */}
              <div className="item-hints hint-tires">
                <div className="hint" data-position="4">
                  <span className="hint-radius"></span>
                  <span className="hint-dot">Tip</span>
                  <div className="hint-content do--split-children">
                    <p>Wheel & Tire Detailing</p>
                  </div>
                </div>
              </div>

              {/* 5. Back Hint (Now points LEFT using position 3) */}
              <div className="item-hints hint-back">
                <div className="hint" data-position="3">
                  <span className="hint-radius"></span>
                  <span className="hint-dot">Tip</span>
                  <div className="hint-content do--split-children">
                    <p>Exhaust & Rear Wash</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 6 */}
      <AdditionalServices />




    </div>
  );
};

export default Home;