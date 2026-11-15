import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { notify } from "../utils/notify";
import { useGoogleLogin } from "@react-oauth/google";
import { API_BASE_URL } from "../config/api";
import "./Login.css";

import {
    FaGoogle, FaFacebookF, FaGithub, FaLinkedinIn,
    FaUser, FaEnvelope, FaLock, FaPhone
} from "react-icons/fa";

const EMAIL_USED_MESSAGE = "This email is already used. Please sign in instead.";

const Login = () => {
    const [isActive, setIsActive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const [regForm, setRegForm] = useState({
        name: "",
        phone: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    const loginEmailRef = useRef(null);
    const loginPasswordRef = useRef(null);

    const handleRegisterClick = () => {
        setIsActive(true);
    }
    const handleLoginClick = () => {
        setIsActive(false);
    }

    const emitAuthChanged = () => {
        window.dispatchEvent(new Event("auth-changed"));
    };

    const handleRegChange = (e) => {
        setRegForm({ ...regForm, [e.target.name]: e.target.value });
    };

    const validateRegistration = () => {
        const errors = {};
        
        const nameTrimmed = regForm.name.trim();
        if (!nameTrimmed) {
            errors.name = "Name is required";
        } else if (nameTrimmed.length < 3) {
            errors.name = "Username must be at least 3 characters long";
        }
        
        const phoneRegex = /^\d{11}$/;
        if (!regForm.phone) {
            errors.phone = "Phone number is required";
        } else if (!phoneRegex.test(regForm.phone)) {
            errors.phone = "Phone number must contain exactly 11 digits and only numeric characters";
        }
        
        const emailTrimmed = regForm.email.trim();
        if (!emailTrimmed) {
            errors.email = "Email is required";
        } else {
            const emailLower = emailTrimmed.toLowerCase();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailLower)) {
                errors.email = "Invalid email format";
            } else if (!emailLower.endsWith("@gmail.com")) {
                errors.email = "Email must end with @gmail.com";
            }
        }
        
        if (!regForm.password) {
            errors.password = "Password is required";
        } else {
            if (regForm.password.length < 10) {
                errors.password = "Password must be at least 10 characters long";
            } else if (!/(?=.*[A-Z])/.test(regForm.password)) {
                errors.password = "Password must contain at least one uppercase letter (A-Z)";
            } else if (!/(?=.*[a-z])/.test(regForm.password)) {
                errors.password = "Password must contain at least one lowercase letter (a-z)";
            } else if (!/(?=.*[0-9])/.test(regForm.password)) {
                errors.password = "Password must contain at least one number (0-9)";
            } else if (!/(?=.*[!@#$%^&*])/.test(regForm.password)) {
                errors.password = "Password must contain at least one special character (!@#$%^&*)";
            }
        }
        
        if (!regForm.confirmPassword) {
            errors.confirmPassword = "Confirm Password is required";
        } else if (regForm.confirmPassword !== regForm.password) {
            errors.confirmPassword = "Passwords do not match";
        }
        
        return errors;
    };

    const submitRegister = async (event) => {
        event.preventDefault();
        
        const errors = validateRegistration();
        const errorKeys = Object.keys(errors);
        if (errorKeys.length > 0) {
            errorKeys.forEach(key => notify.error(`Error - ${errors[key]}`));
            return;
        }
        
        setIsLoading(true);

        try {
            const response = await axios.post(`${API_BASE_URL}/auth/register`, {
                name: regForm.name.trim(),
                phone: regForm.phone,
                email: regForm.email.trim().toLowerCase(),
                password: regForm.password
            });
            const { token, user } = response.data.data;
            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user));
            emitAuthChanged();
            notify.success("Success - Registration successful!");
            setTimeout(() => {
                if (user && user.role === 'admin') {
                    navigate("/admin");
                } else if (user && user.role === 'serviceProvider') {
                    navigate("/service-provider");
                } else {
                    navigate("/select-gender");
                }
            }, 100);
        } catch (err) {
            console.error("Register Error:", err);
            const backendMessage = err.response?.data?.message || "";
            const loweredMessage = backendMessage.toLowerCase();
            const isEmailAlreadyUsed =
                loweredMessage.includes("email") &&
                (loweredMessage.includes("already") ||
                    loweredMessage.includes("used") ||
                    loweredMessage.includes("exist") ||
                    loweredMessage.includes("duplicate"));

            const message = isEmailAlreadyUsed
                ? EMAIL_USED_MESSAGE
                : backendMessage || "Registration failed. Try again.";
            notify.error(`Error - ${message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const submitLogin = async (event) => {
        event.preventDefault();
        setIsLoading(true);

        const email = loginEmailRef.current.value;
        const password = loginPasswordRef.current.value;

        try {
            const response = await axios.post(`${API_BASE_URL}/auth/login`, {
                email,
                password
            });
            const { token, user } = response.data.data;
            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user));
            emitAuthChanged();
            notify.success("Success - Login successful!");
            setTimeout(() => {
                if (user && user.role === 'admin') {
                    navigate("/admin");
                } else if (user && user.role === 'serviceProvider') {
                    navigate("/service-provider");
                } else {
                    navigate("/");
                }
            }, 100);
        } catch (err) {
            console.error("Login Error:", err);
            const message = err.response?.data?.message || "Login failed. Check your credentials.";
            notify.error(`Error - ${message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocialLogin = (e) => {
        e.preventDefault();
        const message = "Only Google login is enabled right now.";
        notify.info(`Info - ${message}`);
    };

    const triggerGoogleSignIn = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setIsLoading(true);
            try {
                // Fetch profile using Google access token
                const userInfoRes = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const googleProfile = userInfoRes.data;

                const response = await axios.post(`${API_BASE_URL}/auth/google`, {
                    email: googleProfile.email,
                    name: googleProfile.name,
                });

                const { token, user } = response.data.data;

                localStorage.setItem("token", token);
                localStorage.setItem("user", JSON.stringify(user));
                emitAuthChanged();

                notify.success("Success - Google sign in successful!");
                setTimeout(() => {
                    if (user && user.role === 'admin') {
                        navigate("/admin");
                    } else if (user && user.role === 'serviceProvider') {
                        navigate("/service-provider");
                    } else {
                        navigate("/");
                    }
                }, 100);
            } catch (err) {
                console.error("Google Auth Error:", err);
                notify.error("Error - Google login failed. Please try again.");
            } finally {
                setIsLoading(false);
            }
        },
        onError: (err) => {
            console.error("Google Login Error:", err);
            notify.error("Error - Google login was cancelled or failed.");
            setIsLoading(false);
        },
    });

    const triggerGoogleSignUp = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setIsLoading(true);
            try {
                const userInfoRes = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const googleProfile = userInfoRes.data;

                const response = await axios.post(`${API_BASE_URL}/auth/google`, {
                    email: googleProfile.email,
                    name: googleProfile.name,
                });

                const { token, user } = response.data.data;

                localStorage.setItem("token", token);
                localStorage.setItem("user", JSON.stringify(user));
                emitAuthChanged();

                notify.success("Success - Google sign up successful!");
                setTimeout(() => {
                    if (user && user.role === 'admin') {
                        navigate("/admin");
                    } else if (user && user.role === 'serviceProvider') {
                        navigate("/service-provider");
                    } else {
                        navigate("/select-gender");
                    }
                }, 100);
            } catch (err) {
                console.error("Google Auth Error:", err);
                notify.error("Error - Google sign up failed. Please try again.");
            } finally {
                setIsLoading(false);
            }
        },
        onError: (err) => {
            console.error("Google Sign Up Error:", err);
            notify.error("Error - Google sign up was cancelled or failed.");
            setIsLoading(false);
        },
    });

    const handleGoogleAuth = (e, mode = "signin") => {
        e.preventDefault();
        if (mode === "signup") {
            triggerGoogleSignUp();
        } else {
            triggerGoogleSignIn();
        }
    };

    return (
        <div className="login-body">
            <div className={`login-container ${isActive ? "active" : ""}`} id="container">

                {/* --- REGISTER FORM --- */}
                <div className="form-container sign-up">
                    <form onSubmit={submitRegister}>
                        <h1>Create Account</h1>
                        <div className="social-icons">
                            <a href="#" className="icon" onClick={(e) => handleGoogleAuth(e, "signup")}><FaGoogle /></a>
                            <a href="#" className="icon" onClick={handleSocialLogin}><FaFacebookF /></a>
                            <a href="#" className="icon" onClick={handleSocialLogin}><FaGithub /></a>
                            <a href="#" className="icon" onClick={handleSocialLogin}><FaLinkedinIn /></a>
                        </div>
                        <span>or use your email for registration</span>
                        <div className="input-wrapper">
                            <input type="text" placeholder="Name" name="name" value={regForm.name} onChange={handleRegChange} required />
                            <FaUser className="input-icon" />
                        </div>
                        <div className="input-wrapper">
                            <input type="tel" placeholder="Phone" name="phone" value={regForm.phone} onChange={handleRegChange} required />
                            <FaPhone className="input-icon" />
                        </div>
                        <div className="input-wrapper">
                            <input type="email" placeholder="Email" name="email" value={regForm.email} onChange={handleRegChange} required />
                            <FaEnvelope className="input-icon" />
                        </div>
                        <div className="input-wrapper">
                            <input type="password" placeholder="Password" name="password" value={regForm.password} onChange={handleRegChange} required />
                            <FaLock className="input-icon" />
                        </div>
                        <div className="input-wrapper">
                            <input type="password" placeholder="Confirm Password" name="confirmPassword" value={regForm.confirmPassword} onChange={handleRegChange} required />
                            <FaLock className="input-icon" />
                        </div>
                        <button type="submit" disabled={isLoading}>{isLoading ? "Loading..." : "Sign Up"}</button>
                    </form>
                </div>

                {/* --- LOGIN FORM --- */}
                <div className="form-container sign-in">
                    <form onSubmit={submitLogin}>
                        <h1>Sign In</h1>
                        <div className="social-icons">
                            <a href="#" className="icon" onClick={(e) => handleGoogleAuth(e, "signin")}><FaGoogle /></a>
                            <a href="#" className="icon" onClick={handleSocialLogin}><FaFacebookF /></a>
                            <a href="#" className="icon" onClick={handleSocialLogin}><FaGithub /></a>
                            <a href="#" className="icon" onClick={handleSocialLogin}><FaLinkedinIn /></a>
                        </div>
                        <span>or use your email password</span>
                        <div className="input-wrapper">
                            <input type="email" placeholder="Email" ref={loginEmailRef} required />
                            <FaEnvelope className="input-icon" />
                        </div>
                        <div className="input-wrapper">
                            <input type="password" placeholder="Password" ref={loginPasswordRef} required />
                            <FaLock className="input-icon" />
                        </div>

                        <a href="/forgot-password" style={{ marginTop: "15px", marginBottom: "10px" }}>
                            Forget Your Password?
                        </a>

                        <button type="submit" disabled={isLoading}>{isLoading ? "Loading..." : "Sign In"}</button>
                    </form>
                </div>

                <div className="toggle-container">
                    <div className="toggle">
                        <div className="toggle-panel toggle-left">
                            <h1>Welcome Back!</h1>
                            <p>Enter your personal details to use all of site features</p>
                            <button type="button" className="ghost-btn" onClick={handleLoginClick}>Sign In</button>
                        </div>
                        <div className="toggle-panel toggle-right">
                            <h1>Hello, Friend!</h1>
                            <p>Register with your personal details to use all of site features</p>
                            <button type="button" className="ghost-btn" onClick={handleRegisterClick}>Sign Up</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
