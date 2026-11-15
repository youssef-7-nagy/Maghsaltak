import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./SelectGender.css";
import { API_BASE_URL } from "../config/api";

const parseStoredUser = () => {
    try {
        return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
        return null;
    }
};

const SelectGender = () => {
    const navigate = useNavigate();
    const [selectedGender, setSelectedGender] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const firstName = useMemo(() => {
        const storedUser = parseStoredUser();
        const name = storedUser?.name?.trim();
        return name ? name.split(/\s+/)[0] : "there";
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const storedUser = parseStoredUser();

        if (!token) {
            navigate("/login", { replace: true });
            return;
        }

        if (storedUser?.role === "admin") {
            navigate("/admin", { replace: true });
            return;
        }

        if (storedUser?.gender) {
            navigate("/profile", { replace: true });
        }
    }, [navigate]);

    const handleSubmit = async () => {
        if (!selectedGender) {
            setError("Please choose your gender before continuing.");
            return;
        }

        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login", { replace: true });
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            const response = await axios.put(
                `${API_BASE_URL}/auth/me/gender`,
                { gender: selectedGender },
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );

            const updatedUserFromServer = response?.data?.data?.user || {};
            const updatedUser = {
                ...(parseStoredUser() || {}),
                ...updatedUserFromServer,
                gender: selectedGender,
            };

            localStorage.setItem("user", JSON.stringify(updatedUser));
            window.dispatchEvent(new Event("auth-changed"));
            navigate("/profile", { replace: true });
        } catch (requestError) {
            const message = requestError?.response?.data?.message || "Failed to save gender. Please try again.";
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="select-gender-page">
            <div className="select-gender-card">
                <h1>Hello {firstName}, choose your profile avatar</h1>
                <p>This helps us show the right default emoji on your profile picture.</p>

                <div className="gender-options">
                    <button
                        type="button"
                        className={`gender-option ${selectedGender === "male" ? "active" : ""}`}
                        onClick={() => setSelectedGender("male")}
                    >
                        <span className="gender-emoji" role="img" aria-label="Male">
                            👨
                        </span>
                        <span>Male</span>
                    </button>

                    <button
                        type="button"
                        className={`gender-option ${selectedGender === "female" ? "active" : ""}`}
                        onClick={() => setSelectedGender("female")}
                    >
                        <span className="gender-emoji" role="img" aria-label="Female">
                            👩
                        </span>
                        <span>Female</span>
                    </button>
                </div>

                {error ? <p className="gender-error">{error}</p> : null}

                <button type="button" className="gender-submit-btn" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Continue To Profile"}
                </button>
            </div>
        </section>
    );
};

export default SelectGender;
