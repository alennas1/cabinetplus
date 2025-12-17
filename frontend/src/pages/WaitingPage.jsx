import React from "react";
import { Clock, LogOut } from "react-feather";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../store/authSlice"; // Assuming this is your path

// NOTE: You should create a specific CSS file (e.g., WaitingPage.css)
// if you want to reuse styles from other components. For this example, 
// I'll define necessary styles locally.

const WaitingPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // --- Logout Logic ---
    const handleLogout = () => {
        dispatch(logout());
        navigate("/login");
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.iconContainer}>
                    <Clock size={48} color="#007bff" />
                </div>
                
                <h1 style={styles.heading}>En attente de validation</h1>
                <p style={styles.paragraph}>
                    Merci d'avoir choisi votre plan. Votre accès complet sera activé
                    dès que l’administrateur aura confirmé votre paiement.
                </p>
                <p style={styles.hint}>
                    Cela ne devrait prendre que quelques instants. Veuillez réessayer de vous connecter plus tard.
                </p>

                {/* --- LOGOUT BUTTON --- */}
                <button
                    onClick={handleLogout}
                    style={styles.logoutButton}
                >
                    <LogOut size={16} style={{ marginRight: '8px' }} />
                    Se déconnecter
                </button>
            </div>
        </div>
    );
};

const styles = {
    container: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        width: "100%",
        backgroundColor: "#f0f0f0",
        fontFamily: "Arial, sans-serif",
    },
    card: {
        textAlign: "center",
        padding: "2.5rem 2rem",
        maxWidth: "400px",
        borderRadius: "12px",
        backgroundColor: "#fff",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    },
    iconContainer: {
        marginBottom: "1rem",
    },
    heading: {
        fontSize: "1.5rem",
        color: "#333",
        marginBottom: "0.5rem",
    },
    paragraph: {
        fontSize: "1rem",
        color: "#555",
        marginBottom: "1.5rem",
    },
    hint: {
        fontSize: "0.85rem",
        color: "#777",
        marginBottom: "2rem",
        fontStyle: "italic",
    },
    logoutButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        padding: '0.8rem',
        marginTop: '1rem',
        backgroundColor: '#dc3545', // Red color for logout
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
    }
};

export default WaitingPage;