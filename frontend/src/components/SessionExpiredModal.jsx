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
      // Clear Redux state & storage immediately
      dispatch(logout());
      // Show modal
      setVisible(true);
    };

    window.addEventListener("sessionExpired", handleSessionExpired);

    return () => {
      window.removeEventListener("sessionExpired", handleSessionExpired);
    };
  }, [dispatch]);

  const handleOk = () => {
    setVisible(false);
    navigate("/login", { replace: true });
  };

  if (!visible) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/70 backdrop-blur-sm"
    >
      <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center mx-4">
        {/* Icon */}
        <div className="mb-6">
          <div className="mx-auto w-24 h-24 flex items-center justify-center rounded-full bg-red-100 animate-pulse">
            <svg
              className="w-12 h-12 text-red-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.68-1.36 3.445 0l6.518 11.604c.75 1.336-.213 2.997-1.723 2.997H3.462c-1.51 0-2.473-1.66-1.723-2.997L8.257 3.1zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-7a1 1 0 00-.993.883L9 7v4a1 1 0 001.993.117L11 11V7a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {/* Title & Message */}
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Session Expirée</h2>
        <p className="text-gray-600 mb-8">
          Pour votre sécurité, votre session a expiré après une longue période d'inactivité.
        </p>

        {/* Reconnect Button */}
        <button
          onClick={handleOk}
          className="w-full py-3 rounded-lg text-white font-semibold shadow-md
                     bg-gradient-to-r from-red-500 to-red-600
                     hover:brightness-110 transition-all duration-300"
        >
          Se reconnecter
        </button>
      </div>
    </div>
  );
};

export default SessionExpiredModal;