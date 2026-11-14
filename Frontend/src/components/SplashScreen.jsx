import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import navLogo from '../assets/BackgroundRemover.png';
import './SplashScreen.css';

const SplashScreen = ({ onComplete }) => {
    const [isVisible, setIsVisible] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        document.body.style.overflow = 'hidden';

        // Auto-expand after 2 seconds
        const expandTimer = setTimeout(() => {
            setIsExpanded(true);
        }, 2000);

        // Complete after 4.5 seconds total
        const hideTimer = setTimeout(() => {
            setIsVisible(false);
        }, 4500);

        return () => {
            document.body.style.overflow = '';
            clearTimeout(expandTimer);
            clearTimeout(hideTimer);
        };
    }, []);

    return (
        <AnimatePresence onExitComplete={onComplete}>
            {isVisible && (
                <motion.div
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none"
                    style={{ background: 'linear-gradient(135deg, #001f3f 0%, #005b9f 100%)' }}
                    initial={{ opacity: 1 }}
                    exit={{
                        opacity: 0,
                        scale: 1.05,
                        filter: 'blur(16px)',
                        transition: { duration: 0.85, ease: [0.4, 0, 0.2, 1] },
                    }}
                >
                    <div className={`splash-brand-card ${isExpanded ? 'expanded' : ''}`}>
                        <div className="card-border"></div>
                        <img src={navLogo} alt="Maghsaltak Logo" className="maghsaltak-logo-img" />
                        <div className="maghsaltak-text-wrapper">
                            <span className="maghsaltak-text-main">
                                Ma<span className="maghsaltak-text-hidden">ghsaltak</span>
                            </span>
                        </div>
                        <div className="maghsaltak-bottom-content">
                            <span className="maghsaltak-premium">PREMIUM WASH</span>
                            <span className="maghsaltak-slogan">TOO FAST TOO CLEAN</span>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SplashScreen;
