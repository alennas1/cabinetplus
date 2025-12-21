import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { LogOut, CheckCircle, XCircle } from "react-feather";
import { useNavigate } from "react-router-dom";
import { logout, setCredentials } from "../store/authSlice"; // Added setCredentials to update user state
import api from "../services/authService"; // Ensure this points to your axios instance
import "./Verify.css"; 

const VerificationPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user, token } = useSelector((state) => state.auth);

    // --- Local State for UI Toggles ---
    const [emailCodeSent, setEmailCodeSent] = useState(false);
    const [phoneCodeSent, setPhoneCodeSent] = useState(false);
    const [emailCode, setEmailCode] = useState("");
    const [phoneCode, setPhoneCode] = useState("");
    const [loading, setLoading] = useState(false);

    // --- Status Checks ---
    const isEmailVerified = user?.isEmailVerified;
    const isPhoneVerified = user?.isPhoneVerified;
    const needsEmailVerification = !isEmailVerified;
    const needsPhoneVerification = !isPhoneVerified;
    
    const isFullyVerified = !needsEmailVerification && !needsPhoneVerification;

    const getStatusText = (isVerified) => isVerified ? "✅ Vérifié" : "⏳ En attente";

    // --- API Logic ---

    const handleSendEmailCode = async () => {
        setLoading(true);
        try {
            await api.post("/api/verify/email/send");
            setEmailCodeSent(true);
            alert("Un code a été envoyé à votre adresse email.");
        } catch (err) {
            alert("Erreur lors de l'envoi de l'email. Réessayez plus tard.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitEmailCode = async () => {
        if (!emailCode) return alert("Veuillez entrer le code.");
        setLoading(true);
        try {
            const response = await api.post("/api/verify/email/check", { code: emailCode });
            if (response.data.verified) {
                // Update Redux state so the checkmark appears immediately
                const updatedUser = { ...user, isEmailVerified: true };
                dispatch(setCredentials({ user: updatedUser, token }));
                alert("Email vérifié !");
            }
        } catch (err) {
            alert("Code incorrect ou expiré.");
        } finally {
            setLoading(false);
        }
    };

    const handleSendPhoneCode = async () => {
        setLoading(true);
        try {
            await api.post("/api/verify/phone/send");
            setPhoneCodeSent(true);
            alert("Un code SMS a été envoyé.");
        } catch (err) {
            alert("Erreur lors de l'envoi du SMS. Vérifiez votre numéro.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitPhoneCode = async () => {
        if (!phoneCode) return alert("Veuillez entrer le code.");
        setLoading(true);
        try {
            const response = await api.post("/api/verify/phone/check", { code: phoneCode });
            if (response.data.verified) {
                const updatedUser = { ...user, isPhoneVerified: true };
                dispatch(setCredentials({ user: updatedUser, token }));
                alert("Téléphone vérifié !");
            }
        } catch (err) {
            alert("Code SMS incorrect.");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        dispatch(logout());
        navigate("/login");
    };

    const handleProceed = () => {
        if (isFullyVerified) {
            navigate("/dashboard"); 
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Action Requise : Vérification</h2>
                
                <p style={{ color: '#555', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    Veuillez compléter les étapes suivantes pour accéder à l'application.
                </p>

                <div className="auth-form" style={{ gap: '0.5rem' }}>

                    {/* --- Email Verification Section --- */}
                    <div className="verification-step-box"> 
                        <p className="verification-status-row">
                            <span>Vérification E-mail:</span>
                            <span>{getStatusText(isEmailVerified)}</span>
                        </p>
                        {needsEmailVerification && (
                            <div className="verification-action-group">
                                {emailCodeSent && (
                                    <input
                                        type="text"
                                        placeholder="Entrez le code"
                                        value={emailCode}
                                        onChange={(e) => setEmailCode(e.target.value)}
                                    />
                                )}
                                <button
                                    className="auth-form-button"
                                    disabled={loading}
                                    onClick={emailCodeSent ? handleSubmitEmailCode : handleSendEmailCode}
                                >
                                    {loading ? 'Chargement...' : emailCodeSent ? 'Soumettre le code' : 'Envoyer le code'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* --- Phone Verification Section --- */}
                    <div className="verification-step-box">
                        <p className="verification-status-row">
                            <span>Vérification Téléphone:</span>
                            <span>{getStatusText(isPhoneVerified)}</span>
                        </p>
                        {needsPhoneVerification && (
                            <div className="verification-action-group">
                                {phoneCodeSent && (
                                    <input
                                        type="text"
                                        placeholder="Entrez le code"
                                        value={phoneCode}
                                        onChange={(e) => setPhoneCode(e.target.value)}
                                    />
                                )}
                                <button
                                    className="auth-form-button"
                                    disabled={loading}
                                    onClick={phoneCodeSent ? handleSubmitPhoneCode : handleSendPhoneCode}
                                >
                                    {loading ? 'Chargement...' : phoneCodeSent ? 'Soumettre le code' : 'Démarrer la vérification'}
                                </button>
                            </div>
                        )}
                    </div>
                </div> 

                {/* --- PROCEED BUTTON --- */}
                <button
                    onClick={handleProceed}
                    disabled={!isFullyVerified}
                    style={{ 
                        marginTop: '2rem',
                        padding: '0.9rem',
                        background: isFullyVerified ? '#2ecc71' : '#bdc3c7',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '1rem',
                        cursor: isFullyVerified ? 'pointer' : 'not-allowed',
                        transition: 'background 0.2s ease',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    {isFullyVerified ? (
                        <>
                            <CheckCircle size={18} style={{ marginRight: '8px' }} />
                            Accéder à l'application
                        </>
                    ) : (
                        <>
                            <XCircle size={18} style={{ marginRight: '8px' }} />
                            Vérification requise
                        </>
                    )}
                </button>

                {/* --- LOGOUT BUTTON --- */}
                <button
                    onClick={handleLogout}
                    className="verification-logout-btn" 
                >
                    <LogOut size={16} style={{ marginRight: '8px' }} />
                    Se déconnecter
                </button>
            </div> 
        </div>
    );
};

export default VerificationPage;