import React from "react";
import { useSelector, useDispatch } from "react-redux"; // Added useSelector, useDispatch
import { useNavigate } from "react-router-dom"; // Added useNavigate
import { LogOut, DollarSign, Clock } from "react-feather"; // Added relevant icons
import { logout } from "../store/authSlice"; // Added logout action

const PlanPage = () => {
  // Redux hooks for status display and logout
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Get the decoded user claims from the Redux store
  const user = useSelector((state) => state.auth.user);
  
  // Extract plan status and expiration details
  const currentPlanStatus = user?.planStatus || 'UNKNOWN';
  const expirationTime = user?.exp ? new Date(user.exp * 1000).toLocaleDateString() : 'N/A';
  
  // --- LOGOUT LOGIC ---
  const handleLogout = () => {
    dispatch(logout()); // Clear Redux state and localStorage
    navigate("/login"); // Redirect to login page
  };
  // --------------------

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh', 
      backgroundColor: '#f4f7f9'
    }}>
      <div style={{ 
        maxWidth: '700px', 
        padding: "2rem", 
        textAlign: "center", 
        backgroundColor: 'white', 
        borderRadius: '10px', 
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' 
      }}>
        
        <DollarSign size={40} color="#dc3545" style={{ marginBottom: '1rem' }} />
        <h1>Gérez Votre Abonnement</h1>
        
        {/* --- Status Alert --- */}
        <div style={{ 
            backgroundColor: currentPlanStatus === 'FREE_TRIAL' ? '#fff3cd' : '#f8d7da', 
            border: currentPlanStatus === 'FREE_TRIAL' ? '1px solid #ffc107' : '1px solid #dc3545',
            color: currentPlanStatus === 'FREE_TRIAL' ? '#856404' : '#721c24',
            padding: '1rem', 
            borderRadius: '5px', 
            marginBottom: '2rem'
        }}>
            <p style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={16} style={{ marginRight: '8px' }} />
                Statut Actuel : {currentPlanStatus} (Expire le {expirationTime})
            </p>
            {currentPlanStatus !== 'FREE_TRIAL' && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                    Votre plan a expiré ou nécessite une mise à jour. Veuillez choisir une option ci-dessous.
                </p>
            )}
        </div>
        {/* -------------------- */}


        <p style={{ color: '#555', marginBottom: '1.5rem' }}>
            Sélectionnez un plan pour continuer à utiliser l'application.
        </p>

        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '15px' 
        }}>
            
            {/* --- Free Trial Plan --- */}
            <div style={{ 
                padding: "1.5rem", 
                border: "2px solid #007bff", 
                borderRadius: "8px", 
                backgroundColor: currentPlanStatus === 'FREE_TRIAL' ? '#e9f5ff' : 'white'
            }}>
                <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Free Trial</p>
                <p style={{ color: '#555', margin: '0.5rem 0 1rem' }}>Essayez notre service pendant 7 jours gratuitement.</p>
                <button 
                    style={{ 
                        padding: '10px 20px', 
                        backgroundColor: '#007bff', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '5px', 
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                    onClick={() => console.log('Selecting Free Trial')}
                >
                    {currentPlanStatus === 'FREE_TRIAL' ? 'Plan Actif' : 'Sélectionner l\'Essai Gratuit'}
                </button>
            </div>

            {/* --- Basic Plan --- */}
            <div style={{ 
                padding: "1.5rem", 
                border: "1px solid #ccc", 
                borderRadius: "8px" 
            }}>
                <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Basic Plan</p>
                <p style={{ color: '#555', margin: '0.5rem 0 1rem' }}>Accès aux fonctionnalités de base (coût mensuel).</p>
                <button
                    style={{ 
                        padding: '10px 20px', 
                        backgroundColor: '#28a745', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '5px', 
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                    onClick={() => console.log('Selecting Basic Plan')}
                >
                    Sélectionner Basic
                </button>
            </div>

            {/* --- Pro Plan --- */}
            <div style={{ 
                padding: "1.5rem", 
                border: "1px solid #ccc", 
                borderRadius: "8px" 
            }}>
                <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Pro Plan</p>
                <p style={{ color: '#555', margin: '0.5rem 0 1rem' }}>Accès complet avec support prioritaire.</p>
                <button
                    style={{ 
                        padding: '10px 20px', 
                        backgroundColor: '#ffc107', 
                        color: '#333', 
                        border: 'none', 
                        borderRadius: '5px', 
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                    onClick={() => console.log('Selecting Pro Plan')}
                >
                    Sélectionner Pro
                </button>
            </div>
        </div>
        
        {/* --- LOGOUT BUTTON --- */}
        <button 
            onClick={handleLogout} 
            style={{ 
                marginTop: '30px', 
                padding: '10px 20px', 
                backgroundColor: '#6c757d', 
                color: 'white', 
                border: 'none', 
                borderRadius: '5px', 
                cursor: 'pointer',
                fontWeight: 'bold'
            }}
        >
            <LogOut size={16} style={{ marginRight: '8px' }} />
            Se déconnecter
        </button>
        
      </div>
    </div>
  );
};

export default PlanPage;