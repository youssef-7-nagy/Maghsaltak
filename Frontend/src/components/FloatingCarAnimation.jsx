import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion';

import car1 from '../assets/14.png';
import car2 from '../assets/cleannn.png';
import car3 from '../assets/carlo.png';
import car4 from '../assets/section5.png';

const CAR_MODELS = [
  { id: 'sports', src: car1 },
  { id: 'suv', src: car2 },
  { id: 'sedan', src: car3 },
  { id: 'electric', src: car4 },
];

const FloatingCarAnimation = () => {
  const { scrollYProgress } = useScroll();
  const [currentCarIndex, setCurrentCarIndex] = useState(0);
  
  // Smooth the scroll progress to give inertia/momentum
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 50,
    damping: 15,
    mass: 1,
  });

  // Calculate section indices based on scroll
  useEffect(() => {
    return smoothProgress.onChange((latest) => {
      let nextIndex = 0;
      if (latest > 0.2 && latest <= 0.45) nextIndex = 1;
      else if (latest > 0.45 && latest <= 0.75) nextIndex = 2;
      else if (latest > 0.75) nextIndex = 3;
      
      if (nextIndex !== currentCarIndex) {
        setCurrentCarIndex(nextIndex);
      }
    });
  }, [smoothProgress, currentCarIndex]);

  // Motion paths & transforms based on scroll
  // X Position: drifts side to side
  const x = useTransform(smoothProgress, 
    [0, 0.25, 0.5, 0.75, 1], 
    ['0vw', '15vw', '-10vw', '20vw', '5vw']
  );
  
  // Y Position: Moves slightly up/down for dynamic feel within the viewport
  const y = useTransform(smoothProgress,
    [0, 0.25, 0.5, 0.75, 1],
    ['30vh', '45vh', '55vh', '65vh', '75vh']
  );

  // Rotation: tilts while scrolling
  const rotate = useTransform(smoothProgress, 
    [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1], 
    [10, -5, 15, -10, 8, -5, 0]
  );

  // Scale: subtle breathing/scaling effect
  const scale = useTransform(smoothProgress,
    [0, 0.2, 0.5, 0.8, 1],
    [1, 1.15, 0.9, 1.2, 1]
  );

  // Determine direction of travel for tilt (derivative of scroll)
  const [scrollVelocity, setScrollVelocity] = useState(0);
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const deltaY = window.scrollY - lastY;
          setScrollVelocity(deltaY);
          lastY = window.scrollY;
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Extra dynamic tilt based on velocity
  const dynamicTilt = Math.max(-20, Math.min(20, scrollVelocity * 0.1));

  return (
    <div 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        pointerEvents: 'none', 
        zIndex: 40,
        overflow: 'hidden'
      }}
    >
      <motion.div
        style={{
          position: 'absolute',
          x,
          y,
          rotate: useTransform(() => rotate.get() + dynamicTilt),
          scale,
          filter: 'drop-shadow(0px 25px 35px rgba(0, 0, 0, 0.5))',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCarIndex}
            initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.2, filter: 'blur(10px)' }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            style={{
              position: 'relative',
              width: '400px', // Default size, will scale responsive
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            {/* Engine Light Glow Effect on Darker Sections */}
            {(currentCarIndex === 2 || currentCarIndex === 3) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: 'absolute',
                  width: '150%',
                  height: '150%',
                  background: currentCarIndex === 3 ? 'radial-gradient(circle, rgba(0,255,255,0.4) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(255,0,0,0.3) 0%, transparent 70%)',
                  zIndex: -1,
                  borderRadius: '50%'
                }}
              />
            )}
            
            {/* Glass Shine Effect */}
            <motion.div
              style={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '50%',
                height: '100%',
                background: 'linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%)',
                transform: 'skewX(-20deg)',
                zIndex: 2,
              }}
              animate={{
                left: ['-100%', '200%']
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                repeatDelay: 3,
                ease: 'easeInOut'
              }}
            />

            <img 
              src={CAR_MODELS[currentCarIndex].src} 
              alt="Floating Cinematic Car" 
              style={{
                width: '100%',
                height: 'auto',
                objectFit: 'contain',
                transform: 'rotate(-15deg)', // base isometric adjustment
              }}
            />

            {/* Particle Trail Effect when moving fast */}
            {Math.abs(scrollVelocity) > 20 && (
               <motion.div
                 initial={{ opacity: 0, scale: 0 }}
                 animate={{ opacity: 0.5, scale: 1 }}
                 exit={{ opacity: 0 }}
                 style={{
                   position: 'absolute',
                   bottom: '-20px',
                   right: '20px',
                   width: '60px',
                   height: '20px',
                   background: 'rgba(255,255,255,0.3)',
                   filter: 'blur(8px)',
                   borderRadius: '50%',
                   transform: 'rotate(-15deg)'
                 }}
               />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default FloatingCarAnimation;
