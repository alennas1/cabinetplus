import React, { useEffect } from "react";
import { LogOut } from "react-feather";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout as logoutApi } from "../services/authService";
import { logout as logoutRedux, setCredentials, setLoading as setAuthLoading } from "../store/authSlice";
import { CLINIC_ROLES, getClinicRole } from "../utils/clinicAccess";
import { isPlanActiveForAccess } from "../utils/planAccess";
import "./WaitingPage.css";

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
            navigate("/appointments", { replace: true });
            return;
          }

        const isActivePlan = isPlanActiveForAccess(userData);
        if (isActivePlan) {
            if (userData?.gestionCabinetPinConfigured !== true) {
                navigate("/pin-setup", { replace: true });
                return;
            }
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
        <div className="waiting-shell">
            <div className="waiting-card">
                <img src="/logo.png" alt="CabinetPlus" className="waiting-logo-center" />

                <h1 className="waiting-title">En attente de validation</h1>
                <p className="waiting-paragraph">
                    Merci d'avoir choisi votre plan. Votre accès complet sera activé dès que l’administrateur aura confirmé votre paiement.
                </p>
                <p className="waiting-hint">
                    Cela prend généralement peu de temps. Cette page se met à jour automatiquement.
                </p>

                <button
                    type="button"
                    onClick={handleLogout}
                    className="waiting-logout-btn"
                >
                    <LogOut size={16} />
                    Se déconnecter
                </button>
            </div>
        </div>
    );
};

export default WaitingPage;
