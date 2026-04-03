import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout as logoutRedux } from "../store/authSlice";

const PinRequired = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const isDentist = user?.role === "DENTIST";

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50 px-6">
      <div className="bg-white rounded-2xl shadow p-6 w-full max-w-lg">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Code PIN requis</h1>
        <p className="text-gray-700 mb-4">
          {isDentist
            ? "Votre compte est actif. Configurez le code PIN du cabinet pour accéder à l'application."
            : "Le code PIN du cabinet n'est pas encore configuré. Demandez au dentiste propriétaire de le configurer."}
        </p>

        <div className="flex flex-wrap gap-3">
          {isDentist ? (
            <button
              type="button"
              onClick={() => navigate("/settings/security")}
              className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-black"
            >
              Configurer le PIN
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => {
              dispatch(logoutRedux());
              navigate("/login", { replace: true });
            }}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
};

export default PinRequired;

