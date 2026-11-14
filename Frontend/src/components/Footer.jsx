import React from 'react';
import { Link } from 'react-router-dom';
import { 
    FaFacebookF, 
    FaTwitter, 
    FaInstagram, 
    FaPhoneAlt, 
    FaEnvelope, 
    FaMapMarkerAlt, 
    FaShareAlt, 
    FaGithub 
} from 'react-icons/fa';
import logoImage from '../assets/BackgroundRemover.png';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-top">
                <div className="footer-container">
                    <div className="footer-grid">

                        {/* --- Brand Column --- */}
                        <div className="footer-col brand-col">
                            <div className="footer-logo">
                                <Link to="/" className="logo" style={{ textDecoration: 'none', justifyContent: 'flex-start' }}>
                                    <img 
                                        src={logoImage} 
                                        alt="Maghsaltak Logo" 
                                        className="logo-img"
                                    />
                                    <div className="logo-placeholder" style={{ textAlign: 'left', marginLeft: '10px' }}>
                                        <span className="logo-text" style={{ color: '#fff' }}>Maghsaltak</span>
                                        <span className="logo-subtext" style={{ color: '#4BA8DA' }}>CAR WASH SERVICE</span>
                                    </div>
                                </Link>
                            </div>
                            <p className="footer-about-text">
                                Premium mobile and express car wash services. We bring the shine directly to your driveway, ensuring your car looks brand new under the sun.
                            </p>
                            
                            {/* --- HOVER MAGIC SOCIAL MENU --- */}
                            <div className="magic-social-wrapper">
                                <ul className="magic-menu">
                                    <div className="magic-toggle">
                                        <FaShareAlt />
                                    </div>
                                    <li style={{ '--i': 1 }}>
                                        <a href="https://facebook.com" className="facebook" target="_blank" rel="noreferrer" aria-label="Facebook"><FaFacebookF /></a>
                                    </li>
                                    <li style={{ '--i': 2 }}>
                                        <a href="https://www.instagram.com/maghsaltakcarwash/" className="instagram" target="_blank" rel="noreferrer" aria-label="Instagram"><FaInstagram /></a>
                                    </li>
                                    <li style={{ '--i': 3 }}>
                                        <a href="https://github.com" className="github" target="_blank" rel="noreferrer" aria-label="GitHub"><FaGithub /></a>
                                    </li>
                                    <li style={{ '--i': 4 }}>
                                        <a href="https://twitter.com" className="twitter" target="_blank" rel="noreferrer" aria-label="Twitter"><FaTwitter /></a>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* --- Quick Links Column --- */}
                        <div className="footer-col links-col">
                            <h3 className="footer-heading">Quick Links</h3>
                            <ul className="footer-list">
                                <li><Link to="/">Home</Link></li>
                                <li><Link to="/about">About Us</Link></li>
                                <li><Link to="/products">Our Services</Link></li>
                                <li><Link to="/book-wash">Book a Wash</Link></li>
                                <li><Link to="/profile">My Account</Link></li>
                            </ul>
                        </div>

                        {/* --- Contact Column --- */}
                        <div className="footer-col contact-col">
                            <h3 className="footer-heading">Contact Us</h3>
                            <ul className="footer-contact-info">
                                <li>
                                    <FaMapMarkerAlt className="contact-icon" />
                                    <span>Rehab Compound Mall - Building G1 - Unit 206</span>
                                </li>
                                <li>
                                    <FaPhoneAlt className="contact-icon" />
                                    <span>0127565022</span>
                                </li>
                                <li>
                                    <FaEnvelope className="contact-icon" />
                                    <span>support@maghsaltak.com</span>
                                </li>
                            </ul>

                            <h3 className="footer-heading mt-20">Working Hours</h3>
                            <p className="footer-hours">Daily<br />06:00 AM - 12:00 PM</p>
                        </div>

                        {/* --- Newsletter Column --- */}
                        <div className="footer-col newsletter-col">
                            <div className="subscribe">
                                <p>SUBSCRIBE</p>
                                <input placeholder="Your e-mail" className="subscribe-input" name="email" type="email" />
                                <br />
                                <div className="submit-btn">SUBMIT</div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* --- Footer Bottom --- */}
            <div className="footer-bottom">
                <div className="footer-container">
                    <div className="bottom-wrapper">
                        <p className="copyright-text">
                            &copy; {new Date().getFullYear()} Maghsaltak Car Wash Service. All rights reserved.
                        </p>
                        <ul className="bottom-links">
                            <li><Link to="/terms">Terms of Service</Link></li>
                            <li><Link to="/privacy">Privacy Policy</Link></li>
                        </ul>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;