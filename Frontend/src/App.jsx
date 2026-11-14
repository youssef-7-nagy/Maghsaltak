import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import ScrollToTop from './components/ScrollToTop';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AppToaster from './components/AppToaster';
import SupportChat from './components/SupportChat';
import AdminSupportChat from './components/AdminSupportChat';
import SplashScreen from './components/SplashScreen';

const Home = lazy(() => import('./pages/Home'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const BookWash = lazy(() => import('./pages/BookWash'));

const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Login = lazy(() => import('./pages/Login'));
const NotFound = lazy(() => import('./pages/NotFound'));
const PackageDetails = lazy(() => import('./pages/PackageDetails'));
const Packages = lazy(() => import('./pages/Packages'));
const Profile = lazy(() => import('./pages/Profile'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const SelectGender = lazy(() => import('./pages/SelectGender'));
const ServiceProviderDashboard = lazy(() => import('./pages/ServiceProviderDashboard'));
const TrackingPage = lazy(() => import('./pages/TrackingPage'));

const PageLoader = ({ label }) => (
    <div className="app-loader">
        <div className="app-loader__spinner" />
        <p>{label}</p>
    </div>
);

const parseStoredUser = () => {
    try {
        return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
        return null;
    }
};

const App = () => {
    const location = useLocation();
    const [showSplash, setShowSplash] = useState(location.pathname === '/');
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const [isCheckingSession, setIsCheckingSession] = useState(!!token);
    const [isLoggedIn, setIsLoggedIn] = useState(() => !!token);
    const [userData, setUserData] = useState(() => parseStoredUser());

    const isAdmin = userData?.role === 'admin';
    const isServiceProvider = userData?.role === 'serviceProvider';
    const needsGenderSelection = !!userData && !isAdmin && !isServiceProvider && !['male', 'female'].includes((userData?.gender || '').toLowerCase());
    const loggedInRedirect = isAdmin ? '/admin' : isServiceProvider ? '/service-provider' : needsGenderSelection ? '/select-gender' : '/profile';

    // Theme State Initialization
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || 'light';
    });

    // Apply the dark class to the HTML element based on state
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    useEffect(() => {
        const syncAuthFromStorage = () => {
            const storedToken = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            setToken(storedToken);
            setIsLoggedIn(!!storedToken);

            try {
                setUserData(storedUser ? JSON.parse(storedUser) : null);
            } catch {
                setUserData(null);
            }
        };

        window.addEventListener('storage', syncAuthFromStorage);
        window.addEventListener('auth-changed', syncAuthFromStorage);

        return () => {
            window.removeEventListener('storage', syncAuthFromStorage);
            window.removeEventListener('auth-changed', syncAuthFromStorage);
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        const checkSession = async () => {
            if (!token) {
                if (!isMounted) return;
                setIsLoggedIn(false);
                setUserData(null);
                setIsCheckingSession(false);
                return;
            }

            const cachedUser = parseStoredUser();
            const isGoogleSession = cachedUser?.provider === 'google';

            if (isGoogleSession) {
                if (!isMounted) return;
                setUserData(cachedUser);
                setIsLoggedIn(true);
                setIsCheckingSession(false);
                return;
            }

            setIsCheckingSession(true);

            try {
                const response = await axios.get('http://localhost:8080/auth/me', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!isMounted) return;

                const serverUser = response.data?.data?.user;

                if (serverUser) {
                    localStorage.setItem('user', JSON.stringify(serverUser));
                    setUserData(serverUser);
                }

                setIsLoggedIn(true);
            } catch (error) {
                if (!isMounted) return;

                const isUnauthorized = error?.response?.status === 401;
                const fallbackUser = parseStoredUser();
                const isGoogleFallback = fallbackUser?.provider === 'google';

                if (isGoogleFallback) {
                    setUserData(fallbackUser);
                    setIsLoggedIn(true);
                    return;
                }

                setUserData(fallbackUser);

                if (isUnauthorized) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setToken(null);
                    setUserData(null);
                    setIsLoggedIn(false);
                } else {
                    setIsLoggedIn(!!token);
                }
            } finally {
                if (isMounted) {
                    setIsCheckingSession(false);
                }
            }
        };

        checkSession();

        return () => {
            isMounted = false;
        };
    }, [token]);

    useEffect(() => {
        const warmupPages = () => {
            import('./pages/Packages');
            import('./pages/PackageDetails');
            import('./pages/AboutUs');
        };

        if ('requestIdleCallback' in window) {
            const idleId = window.requestIdleCallback(warmupPages, { timeout: 1600 });
            return () => window.cancelIdleCallback(idleId);
        }

        const timer = window.setTimeout(warmupPages, 900);
        return () => window.clearTimeout(timer);
    }, []);

    const handleLogout = useMemo(
        () => () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.dispatchEvent(new Event('auth-changed'));
        },
        [],
    );

    return (
        <>
            {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
            <ScrollToTop />
            <AppToaster />
            {/* Pass theme and toggleTheme to Navbar */}
            <Navbar isLoggedIn={isLoggedIn} userData={userData} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            <main style={{ minHeight: 'calc(100vh - 80px - 300px)' }}>
                {isCheckingSession ? (
                    <PageLoader label="Checking your session..." />
                ) : (
                    <Suspense fallback={<PageLoader label="Loading page..." />}>
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/about" element={<AboutUs />} />
                            <Route path="/book-wash" element={<BookWash />} />
                            <Route path="/packages" element={<Packages />} />
                            <Route path="/packages/:id" element={<PackageDetails />} />

                            <Route
                                path="/login"
                                element={isLoggedIn ? <Navigate to={loggedInRedirect} replace /> : <Login />}
                            />
                            <Route
                                path="/forgot-password"
                                element={isLoggedIn ? <Navigate to={loggedInRedirect} replace /> : <ForgotPassword />}
                            />
                            {/* Reset password — always accessible (user may not be logged in) */}
                            <Route path="/reset-password" element={<ResetPassword />} />

                            <Route
                                path="/profile"
                                element={
                                    !isLoggedIn ? <Navigate to="/login" replace /> :
                                    (isAdmin || isServiceProvider) ? <NotFound /> :
                                    needsGenderSelection ? <Navigate to="/select-gender" replace /> : <Profile />
                                }
                            />
                            <Route
                                path="/select-gender"
                                element={
                                    !isLoggedIn ? <Navigate to="/login" replace /> :
                                    (isAdmin || isServiceProvider) ? <NotFound /> :
                                    needsGenderSelection ? <SelectGender /> : <Navigate to="/profile" replace />
                                }
                            />
                            <Route
                                path="/admin"
                                element={
                                    !isLoggedIn ? <Navigate to="/login" replace /> :
                                    isAdmin ? <AdminPanel /> : <NotFound />
                                }
                            />

                            <Route
                                path="/service-provider"
                                element={
                                    !isLoggedIn ? <Navigate to="/login" replace /> :
                                    isServiceProvider ? <ServiceProviderDashboard /> : <NotFound />
                                }
                            />

                            {/* Live tracking — accessible to any logged-in user */}
                            <Route
                                path="/track/:bookingId"
                                element={
                                    isLoggedIn ? (
                                        <TrackingPage />
                                    ) : (
                                        <Navigate to="/login" replace />
                                    )
                                }
                            />

                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </Suspense>
                )}
            </main>
            <Footer />
            {/* Support chat — only for regular logged-in clients */}
            {isLoggedIn && !isAdmin && !isServiceProvider && !location.pathname.startsWith('/track') && <SupportChat />}
            {/* Admin floating support inbox */}
            {isLoggedIn && isAdmin && <AdminSupportChat />}
        </>
    );
};

export default App;
