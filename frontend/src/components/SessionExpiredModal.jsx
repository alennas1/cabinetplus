import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { logout } from "../store/authSlice";
import { useNavigate } from "react-router-dom";

const SessionExpiredModal = () => {
  const [visible, setVisible] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const handleSessionExpired = () => {
      // 1. Immediately clear the Redux state and storage
      // This ensures the user is "logged out" in the background 
      // even before they click the button.
      dispatch(logout());
      
      // 2. Show the modal
      setVisible(true);
    };

    window.addEventListener("sessionExpired", handleSessionExpired);

    return () => {
      window.removeEventListener("sessionExpired", handleSessionExpired);
    };
  }, [dispatch]);

  const handleOk = () => {
    setVisible(false);
    // 3. Redirect to login
    navigate("/login", { replace: true });
  };

  if (!visible) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-[9999]" 
      style={{ backgroundColor: "rgba(0, 0, 0, 0.7)", position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-sm w-full text-center mx-4">
        <div className="mb-4 text-red-500">
          <svg 
            className="w-16 h-16 mx-auto" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="避12H12m0 0l-4-4m4 4l4-4m-4 4V4" />
            <circle cx="12" cy="12" r="10" strokeWidth={2} />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Session Expirée</h2>
        <p className="text-gray-600 mb-8">
          Pour votre sécurité, votre session a expiré après une longue période d'inactivité.
        </p>
        <button
          onClick={handleOk}
          style={{ backgroundColor: "#3498db", width: "100%" }}
          className="text-white font-semibold py-3 rounded-lg hover:brightness-110 transition-all shadow-md"
        >
          Se reconnecter
        </button>
      </div>
    </div>
  );
};

export default SessionExpiredModal;