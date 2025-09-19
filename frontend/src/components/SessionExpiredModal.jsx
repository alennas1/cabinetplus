import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { logout } from "../store/authSlice";

const SessionExpiredModal = () => {
  const [visible, setVisible] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    const handleSessionExpired = () => {
      setVisible(true);
    };

    window.addEventListener("sessionExpired", handleSessionExpired);

    return () => {
      window.removeEventListener("sessionExpired", handleSessionExpired);
    };
  }, []);

  const handleOk = () => {
    setVisible(false);
    dispatch(logout());
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full text-center">
        <h2 className="text-2xl font-semibold mb-4">Session Expirée</h2>
        <p className="mb-6">Votre session a expiré. Veuillez vous reconnecter.</p>
        <button
          onClick={handleOk}
          style={{ backgroundColor: "#3498db" }}
          className="text-white px-5 py-2 rounded-md hover:opacity-90 transition"
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default SessionExpiredModal;
