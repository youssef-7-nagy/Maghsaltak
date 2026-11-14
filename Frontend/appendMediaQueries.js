const fs = require('fs');
const path = require('path');

const homeCssPath = path.join(__dirname, 'src', 'pages', 'Home.css');

const mediaQueries = `
/* =========================================
   MASSIVE RESPONSIVE OVERRIDES
   ========================================= */

@media (max-width: 1440px) {
    .splash-text-small {
        margin-left: -50px;
    }
}

@media (max-width: 1024px) {
    .splash-image-wrapper {
        max-width: 90%;
    }
    
    .splash-car-overlay {
        width: 30%;
    }
    
    .splash-text-small {
        margin-left: 0;
        margin-bottom: 0;
    }

    .hero-content {
        flex-direction: column;
        text-align: center;
    }
    
    .hero-actions {
        justify-content: center;
    }
    
    .hero-glass-card {
        width: 100%;
        max-width: 400px;
    }
    
    .mission-grid,
    .section-2-grid {
        grid-template-columns: 1fr;
        gap: 3rem;
    }
    
    .mission-content, 
    .section-2-content {
        align-items: center;
        text-align: center;
    }
    
    .section-2-features {
        flex-direction: column;
        align-items: center;
    }
    
    .feature-badge {
        width: 100%;
        max-width: 300px;
    }
    
    .section-content {
        padding: 0 1rem;
    }

    .cool-typo-container {
        align-items: center;
        text-align: center;
    }
    .cool-typo-heading {
        align-items: center;
    }
}

@media (max-width: 768px) {
    .home-section {
        padding: 4rem 1rem;
    }

    .splash-text-large {
        font-size: clamp(3.5rem, 8vw, 5rem);
    }
    
    .splash-text-small {
        font-size: clamp(2rem, 5vw, 3rem);
    }
    
    .splash-car-overlay {
        width: 40%;
    }

    .cool-typo-line-1,
    .cool-typo-wash {
        font-size: clamp(3rem, 7vw, 4rem);
    }
    
    .cool-typo-leave-block {
        font-size: clamp(1rem, 4vw, 1.5rem);
    }
    
    .hero-title {
        font-size: clamp(2rem, 6vw, 3rem);
    }
}

@media (max-width: 480px) {
    .splash-car-overlay {
        width: 50%;
    }
    
    .splash-text-large {
        font-size: clamp(2.5rem, 10vw, 3.5rem);
    }
    
    .btn-primary-cut,
    .btn-secondary-cut,
    .btn-dark-slate {
        width: 100%;
    }
    
    .hero-glass-card {
        padding: 1.5rem;
    }
    
    .liquid-button {
        width: 100%;
        max-width: 250px;
    }
}
`;

fs.appendFileSync(homeCssPath, mediaQueries);
console.log("Media queries appended to Home.css successfully.");
