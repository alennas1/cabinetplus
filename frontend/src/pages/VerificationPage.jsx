import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { LogOut, CheckCircle, XCircle } from "react-feather"; // Added icons for status
import { useNavigate } from "react-router-dom";
import { logout } from "../store/authSlice";
import "./Verify.css"; 

const VerificationPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const user = useSelector((state) => state.auth.user);

    // --- Logout Logic ---
    const handleLogout = () => {
        dispatch(logout());
        navigate("/login");
    };

    // --- Status Checks ---
    const isEmailVerified = user?.isEmailVerified;
    const isPhoneVerified = user?.isPhoneVerified;
    const needsEmailVerification = !isEmailVerified;
    const needsPhoneVerification = !isPhoneVerified;
    
    // Determine if the user is fully verified
    const isFullyVerified = !needsEmailVerification && !needsPhoneVerification;

    // --- Local State for UI Toggles ---
    const [emailCodeSent, setEmailCodeSent] = useState(false);
    const [phoneCodeSent, setPhoneCodeSent] = useState(false);
    const [emailCode, setEmailCode] = useState("");
    const [phoneCode, setPhoneCode] = useState("");

    const getStatusText = (isVerified) => isVerified ? "✅ Vérifié" : "⏳ En attente";

    // --- Navigation when Fully Verified ---
    const handleProceed = () => {
        if (isFullyVerified) {
            // If they reach this page and are fully verified, it means RequireAuth 
            // will next send them to /plan or /dashboard, so navigate to a protected route
            navigate("/dashboard"); 
        }
    };


    return (
        <div className="auth-container">
            <div className="auth-card">
                {/* REMOVED: LogIn icon */}

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
                                    onClick={() => {
                                        if (!emailCodeSent) {
                                            console.log('Sending verification email...');
                                            // TODO: Add API call to send code
                                            setEmailCodeSent(true);
                                        } else {
                                            console.log('Submitting email code:', emailCode);
                                            // TODO: Add API call to verify code
                                        }
                                    }}
                                >
                                    {emailCodeSent ? 'Soumettre le code' : 'Renvoyer le code'}
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
                                    onClick={() => {
                                        if (!phoneCodeSent) {
                                            console.log('Starting phone verification...');
                                            // TODO: Add API call to send code
                                            setPhoneCodeSent(true);
                                        } else {
                                            console.log('Submitting phone code:', phoneCode);
                                            // TODO: Add API call to verify code
                                        }
                                    }}
                                >
                                    {phoneCodeSent ? 'Soumettre le code' : 'Démarrer la vérification'}
                                </button>
                            </div>
                        )}
                    </div>
                </div> 

                {/* --- PROCEED BUTTON (Suivant / Accéder à l'application) --- */}
                <button
                    onClick={handleProceed}
                    disabled={!isFullyVerified}
                    style={{ 
                        marginTop: '2rem',
                        padding: '0.9rem',
                        background: isFullyVerified ? '#2ecc71' : '#bdc3c7', // Green if ready, Gray if blocked
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

                {/* REMOVED: Footer text */}
            </div> 
        </div>
    );
};

export default VerificationPage;