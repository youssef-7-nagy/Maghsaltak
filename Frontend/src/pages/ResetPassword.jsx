import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaLock, FaEye, FaEyeSlash, FaArrowLeft, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import './Login.css';
import './ResetPassword.css';

const API_BASE = 'http://localhost:8080';

const PasswordStrengthBar = ({ password }) => {
    const getStrength = () => {
        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        return score;
    };

    const strength = getStrength();
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['', '#e53e3e', '#ed8936', '#ecc94b', '#38a169'];

    if (!password) return null;

    return (
        <div className="rp-strength-bar">
            <div className="rp-strength-segments">
                {[1, 2, 3, 4].map((seg) => (
                    <div
                        key={seg}
                        className="rp-strength-seg"
                        style={{
                            background: seg <= strength ? colors[strength] : '#e2e8f0',
                            transition: 'background 0.3s ease',
                        }}
                    />
                ))}
            </div>
            <span className="rp-strength-label" style={{ color: colors[strength] }}>
                {labels[strength]}
            </span>
        </div>
    );
};

const ResetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    const [isSuccess, setIsSuccess] = useState(false);
    const [countdown, setCountdown] = useState(5);

    // Redirect countdown after success
    useEffect(() => {
        if (!isSuccess) return;
        const interval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    navigate('/login');
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [isSuccess, navigate]);

    // If no token in URL, show an error immediately
    if (!token) {
        return (
            <div className="login-body">
                <div className="rp-standalone-card">
                    <div className="rp-icon-wrapper rp-icon-error">
                        <FaTimesCircle />
                    </div>
                    <h2 className="rp-heading">Invalid Link</h2>
                    <p className="rp-desc">
                        This password reset link is invalid or missing a token. Please request a new one.
                    </p>
                    <Link to="/forgot-password" className="rp-btn rp-btn-primary">
                        Request New Link
                    </Link>
                    <Link to="/login" className="rp-back-link">
                        <FaArrowLeft style={{ marginRight: 6 }} /> Back to Login
                    </Link>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFeedback({ type: '', message: '' });

        if (newPassword.length < 6) {
            setFeedback({ type: 'error', message: 'Password must be at least 6 characters.' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setFeedback({ type: 'error', message: 'Passwords do not match.' });
            return;
        }

        setIsLoading(true);

        try {
            const response = await axios.post(`${API_BASE}/auth/reset-password`, {
                token,
                newPassword,
            });

            setIsSuccess(true);
            setFeedback({
                type: 'success',
                message: response.data?.message || 'Password updated successfully!',
            });
        } catch (error) {
            const msg =
                error.response?.data?.message ||
                'Failed to reset password. The link may have expired.';
            setFeedback({ type: 'error', message: msg });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-body">
            <div className="rp-standalone-card">

                {/* Success State */}
                {isSuccess ? (
                    <div className="rp-success-state">
                        <div className="rp-icon-wrapper rp-icon-success">
                            <FaCheckCircle />
                        </div>
                        <h2 className="rp-heading">Password Updated!</h2>
                        <p className="rp-desc">
                            Your password has been changed successfully. Redirecting you to login in{' '}
                            <strong>{countdown}</strong> seconds...
                        </p>
                        <Link to="/login" className="rp-btn rp-btn-primary">
                            Go to Login Now
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Lock icon header */}
                        <div className="rp-icon-wrapper rp-icon-primary">
                            <FaLock />
                        </div>
                        <h2 className="rp-heading">Set New Password</h2>
                        <p className="rp-desc">
                            Choose a strong new password for your Maghsaltak account.
                        </p>

                        <form onSubmit={handleSubmit} className="rp-form" noValidate>
                            {/* New Password */}
                            <div className="rp-field-group">
                                <label className="rp-label">New Password</label>
                                <div className="rp-input-wrapper">
                                    <input
                                        type={showNew ? 'text' : 'password'}
                                        className="rp-input"
                                        placeholder="Enter new password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        disabled={isLoading}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        className="rp-toggle-eye"
                                        onClick={() => setShowNew((v) => !v)}
                                        tabIndex={-1}
                                        aria-label="Toggle password visibility"
                                    >
                                        {showNew ? <FaEyeSlash /> : <FaEye />}
                                    </button>
                                </div>
                                <PasswordStrengthBar password={newPassword} />
                            </div>

                            {/* Confirm Password */}
                            <div className="rp-field-group">
                                <label className="rp-label">Confirm Password</label>
                                <div className="rp-input-wrapper">
                                    <input
                                        type={showConfirm ? 'text' : 'password'}
                                        className="rp-input"
                                        placeholder="Repeat new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        disabled={isLoading}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        className="rp-toggle-eye"
                                        onClick={() => setShowConfirm((v) => !v)}
                                        tabIndex={-1}
                                        aria-label="Toggle confirm password visibility"
                                    >
                                        {showConfirm ? <FaEyeSlash /> : <FaEye />}
                                    </button>
                                </div>
                                {confirmPassword && newPassword !== confirmPassword && (
                                    <p className="rp-mismatch">⚠ Passwords do not match</p>
                                )}
                                {confirmPassword && newPassword === confirmPassword && (
                                    <p className="rp-match">✓ Passwords match</p>
                                )}
                            </div>

                            {/* Feedback */}
                            {feedback.message && (
                                <div className={`rp-feedback rp-feedback--${feedback.type}`}>
                                    {feedback.message}
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                className={`rp-btn rp-btn-primary rp-btn-full ${isLoading ? 'rp-btn-loading' : ''}`}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <span className="rp-spinner-text">
                                        <span className="rp-dot-spinner" /> Updating...
                                    </span>
                                ) : (
                                    '🔒 Update Password'
                                )}
                            </button>
                        </form>

                        <Link to="/login" className="rp-back-link">
                            <FaArrowLeft style={{ marginRight: 6 }} /> Back to Login
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
