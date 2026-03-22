import React, { useEffect } from "react";
import { Clock, LogOut } from "react-feather";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout as logoutApi } from "../services/authService";
import { logout as logoutRedux, setCredentials, setLoading as setAuthLoading } from "../store/authSlice";
import { CLINIC_ROLES, getClinicRole } from "../utils/clinicAccess";
import { isPlanActiveForAccess } from "../utils/planAccess";
// NOTE: You should create a specific CSS file (e.g., WaitingPage.css)
// if you want to reuse styles from other components. For this example, 
// I'll define necessary styles locally.

const WaitingPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user, token } = useSelector((state) => state.auth);

    const handleRedirect = (userData) => {
        if (!userData) return;

        if (userData.role === "ADMIN") {
            navigate("/admin-dashboard", { replace: true });
            return;
        }

        if (!userData.phoneVerified) {
            navigate("/verify", { replace: true });
            return;
        }

        const clinicRole = getClinicRole(userData);
        if (clinicRole !== CLINIC_ROLES.DENTIST) {
            if (clinicRole === CLINIC_ROLES.PARTNER_DENTIST) navigate("/dashboard", { replace: true });
            else navigate("/appointments", { replace: true });
            return;
        }

        const isActivePlan = isPlanActiveForAccess(userData);
        if (isActivePlan) {
            navigate("/dashboard", { replace: true });
        }
    };

    useEffect(() => {
        if (!user) {
            navigate("/login", { replace: true });
            return;
        }

        if (isPlanActiveForAccess(user)) {
            handleRedirect(user);
            return;
        }

        let cancelled = false;
        const checkStatus = async () => {
            try {
                const updatedUser = await getCurrentUser();
                if (cancelled) return;
                dispatch(setAuthLoading(true));
                dispatch(setCredentials({ token, user: updatedUser }));
                handleRedirect(updatedUser);
            } catch (err) {
                if (cancelled) return;
                if (err?.response?.status === 401) {
                    dispatch(logoutRedux());
                    navigate("/login", { replace: true, state: { reason: "session_expired" } });
                }
            }
        };

        checkStatus();
        const id = window.setInterval(checkStatus, 10000);
        return () => {
            cancelled = true;
            window.clearInterval(id);
        };
    }, [user, token, dispatch, navigate]);

    // --- Logout Logic ---
     const handleLogout = async (e) => {
        e?.preventDefault?.();
        try {
          await logoutApi();
        } catch (error) {
          console.error("Logout API failed:", error);
        } finally {
          dispatch(logoutRedux());
          navigate("/login", { replace: true });
        }
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
                    type="button"
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
