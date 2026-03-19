import { toast } from "react-toastify";
import { registerSW } from "virtual:pwa-register";

let didInit = false;
let updateToastId = null;

export function initPwaUpdatePrompt() {
  if (didInit) return;
  didInit = true;

  const updateSW = registerSW({
    onNeedRefresh() {
      if (updateToastId != null && toast.isActive(updateToastId)) return;

      updateToastId = toast.info(
        (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="font-semibold">Nouvelle version disponible</div>
              <div className="text-sm opacity-90">Mettez à jour pour obtenir les derniers correctifs.</div>
            </div>
            <button
              type="button"
              className="px-3 py-2 rounded bg-slate-900 text-white text-sm hover:bg-slate-800"
              onClick={async () => {
                toast.dismiss(updateToastId);
                updateToastId = null;
                try {
                  await updateSW(true);
                } finally {
                  window.location.reload();
                }
              }}
            >
              Mettre à jour
            </button>
          </div>
        ),
        {
          autoClose: false,
          closeOnClick: false,
          closeButton: false,
          draggable: false,
        }
      );
    },
    onOfflineReady() {
      // Optional: keep it quiet to avoid noise in production.
    },
  });
}

