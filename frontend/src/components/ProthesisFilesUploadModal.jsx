import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UploadCloud, X, Trash2 } from "react-feather";
import { toast } from "react-toastify";

import { deleteProthesisFile, listProthesisFiles, uploadProthesisFileItem } from "../services/prostheticsService";
import { getApiErrorMessage } from "../utils/error";

const formatBytes = (bytes) => {
  const n = Number(bytes || 0);
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = n;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  const decimals = i === 0 ? 0 : i === 1 ? 1 : 2;
  return `${value.toFixed(decimals)} ${units[i]}`;
};

const isZipFile = (file) => {
  const name = String(file?.name || "").trim().toLowerCase();
  return name.endsWith(".zip");
};

const makeTaskKey = (file, index) => {
  const name = String(file?.name || "file");
  const size = Number(file?.size || 0);
  const lastModified = Number(file?.lastModified || 0);
  return `${name}__${size}__${lastModified}__${Date.now()}__${index}`;
};

export default function ProthesisFilesUploadModal({
  open,
  prothesisId,
  title,
  onClose,
  onUploaded,
  accept = ".stl,.obj,.ply,.dcm,.dicom,.zip",
}) {
  const [existingFiles, setExistingFiles] = useState([]);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);

  const [uploads, setUploads] = useState([]);
  const [deleteIds, setDeleteIds] = useState(() => new Set());
  const [sessionUploadedIds, setSessionUploadedIds] = useState(() => new Set());

  const [isDragOver, setIsDragOver] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const queueRef = useRef([]);
  const runningRef = useRef(0);
  const CONCURRENCY = 3;

  const hasActiveUploads = useMemo(() => {
    return uploads.some((u) => u.status === "queued" || u.status === "uploading");
  }, [uploads]);

  const isLocked = isSaving || isCancelling;

  const existingHasZip = useMemo(() => {
    return (existingFiles || []).some((f) => {
      const name = String(f?.filename || "").toLowerCase();
      const type = String(f?.fileType || "").toLowerCase();
      return name.endsWith(".zip") || type.includes("zip");
    });
  }, [existingFiles]);

  const refreshExisting = useCallback(async () => {
    if (!prothesisId) {
      setExistingFiles([]);
      return;
    }
    setIsLoadingExisting(true);
    try {
      const data = await listProthesisFiles(prothesisId);
      setExistingFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      setExistingFiles([]);
    } finally {
      setIsLoadingExisting(false);
    }
  }, [prothesisId]);

  const updateUpload = useCallback((key, patch) => {
    setUploads((prev) => prev.map((u) => (u.key === key ? { ...u, ...patch } : u)));
  }, []);

  const removeUpload = useCallback((key) => {
    setUploads((prev) => prev.filter((u) => u.key !== key));
  }, []);

  const runTask = useCallback(
    async (task) => {
      if (!prothesisId || !task?.file) return;
      if (task.status !== "queued") return;

      const controller = new AbortController();
      updateUpload(task.key, { status: "uploading", controller, progress: 0, error: null });

      const path = task.file.webkitRelativePath || task.file.name || "";
      try {
        const created = await uploadProthesisFileItem(prothesisId, task.file, path, {
          signal: controller.signal,
          onUploadProgress: (evt) => {
            const total = Number(evt?.total || 0);
            const loaded = Number(evt?.loaded || 0);
            if (!total || total <= 0) return;
            const pct = Math.max(0, Math.min(100, Math.round((loaded / total) * 100)));
            updateUpload(task.key, { progress: pct });
          },
        });

        if (created?.id) {
          setExistingFiles((prev) => {
            const ids = new Set(prev.map((p) => p?.id).filter(Boolean));
            if (ids.has(created.id)) return prev;
            return [created, ...prev];
          });
          setSessionUploadedIds((prev) => {
            const next = new Set(prev);
            next.add(created.id);
            return next;
          });
        }

        removeUpload(task.key);
      } catch (err) {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
          removeUpload(task.key);
          return;
        }
        updateUpload(task.key, { status: "error", error: getApiErrorMessage(err, "Erreur upload") });
      }
    },
    [prothesisId, removeUpload, updateUpload]
  );

  const pumpQueue = useCallback(() => {
    while (runningRef.current < CONCURRENCY && queueRef.current.length > 0) {
      const task = queueRef.current.shift();
      if (!task) continue;
      runningRef.current += 1;
      Promise.resolve()
        .then(() => runTask(task))
        .finally(() => {
          runningRef.current -= 1;
          pumpQueue();
        });
    }
  }, [runTask]);

  const enqueue = useCallback(
    (task) => {
      queueRef.current.push(task);
      pumpQueue();
    },
    [pumpQueue]
  );

  useEffect(() => {
    if (!open) return;
    refreshExisting();
  }, [open, refreshExisting]);

  useEffect(() => {
    if (open) return;
    setExistingFiles([]);
    setIsLoadingExisting(false);
    setUploads([]);
    setDeleteIds(new Set());
    setSessionUploadedIds(new Set());
    setIsSaving(false);
    setIsCancelling(false);
    setIsDragOver(false);
  }, [open]);

  const addFilesAndUpload = (files) => {
    if (!prothesisId) return;
    const list = Array.from(files || []).filter(Boolean);
    if (!list.length) return;

    const nextTasks = list.map((file, index) => ({
      key: makeTaskKey(file, index),
      file,
      displayPath: file.webkitRelativePath || file.name || "fichier",
      status: "queued",
      progress: 0,
      error: null,
      controller: null,
    }));

    setUploads((prev) => [...nextTasks, ...prev]);
    nextTasks.forEach((t) => enqueue(t));
  };

  const handleCancel = async () => {
    if (isCancelling) return;
    if (!prothesisId) {
      onClose?.();
      return;
    }

    setIsCancelling(true);
    try {
      // Abort in-flight uploads
      uploads.forEach((u) => {
        try {
          u?.controller?.abort?.();
        } catch {
          // ignore
        }
      });
      queueRef.current = [];
      setUploads([]);

      // Roll back files uploaded during this modal session
      const ids = Array.from(sessionUploadedIds);
      if (ids.length) {
        await Promise.allSettled(ids.map((id) => deleteProthesisFile(prothesisId, id)));
        setExistingFiles((prev) => prev.filter((f) => !ids.includes(f?.id)));
        setSessionUploadedIds(new Set());
      }

      setDeleteIds(new Set());
      setInputKey((k) => k + 1);
      onUploaded?.();
      onClose?.();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur annulation upload"));
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSave = async () => {
    if (!prothesisId) return;
    if (hasActiveUploads) return;
    if (isSaving) return;

    setIsSaving(true);
    try {
      const ids = Array.from(deleteIds);
      if (ids.length) {
        await Promise.allSettled(ids.map((id) => deleteProthesisFile(prothesisId, id)));
      }
      setDeleteIds(new Set());
      await refreshExisting();
      onUploaded?.();
      onClose?.();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur enregistrement fichiers"));
    } finally {
      setIsSaving(false);
    }
  };

  const filesInputId = `prothesis-files-input-${inputKey}`;
  const folderInputId = `prothesis-folder-input-${inputKey}`;
  const acceptLabel = String(accept || "")
    .split(",")
    .map((s) => s.trim().replace(/^\./, ""))
    .filter(Boolean)
    .join(", ");

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 10000 }}
      onClick={() => {
        if (isLocked) return;
        handleCancel();
      }}
    >
      <div className="modal-content" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end items-center mb-2">
          <X
            size={20}
            className="cursor-pointer"
            onClick={() => {
              if (isLocked) return;
              handleCancel();
            }}
            title="Fermer"
            aria-label="Fermer"
          />
        </div>

        <form noValidate className="modal-form" onSubmit={(e) => e.preventDefault()}>
          {title ? <h2 style={{ marginBottom: 10 }}>{title}</h2> : null}

          {prothesisId ? (
            <div style={{ marginBottom: 10 }}>
              {hasActiveUploads ? (
                <div className="uploading-bar" style={{ marginBottom: 10 }} aria-label="Upload en cours" />
              ) : null}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div className="text-[12px] text-gray-700" style={{ fontWeight: 600 }}>
                  Fichiers
                </div>
                <div className="text-[12px] text-gray-500">{isLoadingExisting ? "Chargement..." : ""}</div>
              </div>

              {existingHasZip ? (
                <div className="text-[12px] text-gray-600" style={{ marginTop: 6 }}>
                  Un ZIP est deja present. Il sera garde comme fichier normal.
                </div>
              ) : null}

              {uploads.length || existingFiles?.length ? (
                <div style={{ marginTop: 8, maxHeight: 260, overflow: "auto", display: "grid", gap: 8 }}>
                  {uploads.map((u) => (
                    <div
                      key={u.key}
                      className="document-file-summary"
                      style={{
                        justifyContent: "flex-start",
                        gap: 10,
                        background: "#eff6ff",
                        borderColor: "#bfdbfe",
                        flexDirection: "column",
                        alignItems: "stretch",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                            <strong style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {u.displayPath}
                            </strong>
                            <span className="text-[11px] text-gray-500" style={{ flexShrink: 0 }}>
                              {formatBytes(u.file?.size || 0)}
                            </span>
                          </div>
                          {u.status === "error" ? (
                            <div className="text-[11px] text-red-600" style={{ marginTop: 2 }}>
                              {u.error || "Erreur upload"}
                            </div>
                          ) : (
                            <div className="text-[11px] text-blue-700" style={{ marginTop: 2 }}>
                              {u.status === "uploading" ? "Upload en cours..." : "En attente..."}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          className="action-btn cancel"
                          onClick={() => {
                            try {
                              u?.controller?.abort?.();
                            } catch {
                              // ignore
                            }
                            removeUpload(u.key);
                          }}
                          disabled={isSaving || isCancelling}
                          title="Retirer"
                          aria-label="Retirer"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {u.status !== "error" ? (
                        <div className="upload-progress" aria-label="Progression upload">
                          <div style={{ width: `${Math.max(0, Math.min(100, u.progress || 0))}%` }} />
                        </div>
                      ) : null}
                    </div>
                  ))}

                  {(existingFiles || []).map((f) => {
                    const displayPath = f?.relativePath || f?.filename || "fichier";
                    const size = f?.fileSizeBytes || 0;
                    const marked = !!f?.id && deleteIds.has(f.id);
                    return (
                      <div
                        key={`existing-${f?.id || displayPath}`}
                        className="document-file-summary"
                        style={{
                          justifyContent: "flex-start",
                          gap: 10,
                          background: marked ? "#fef2f2" : undefined,
                          borderColor: marked ? "#fecaca" : undefined,
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                            <strong
                              style={{
                                fontSize: 12,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                textDecoration: marked ? "line-through" : "none",
                              }}
                            >
                              {displayPath}
                            </strong>
                            <span className="text-[11px] text-gray-500" style={{ flexShrink: 0 }}>
                              {formatBytes(size)}
                            </span>
                          </div>
                          {marked ? (
                            <div className="text-[11px] text-red-600" style={{ marginTop: 2 }}>
                              Sera supprime au clic sur Enregistrer
                            </div>
                          ) : null}
                        </div>

                          <button
                            type="button"
                            className={`action-btn ${marked ? "view" : "cancel"}`}
                            disabled={isLocked || !f?.id}
                            onClick={() => {
                              if (!f?.id) return;
                              setDeleteIds((prev) => {
                                const next = new Set(prev);
                              if (next.has(f.id)) next.delete(f.id);
                              else next.add(f.id);
                              return next;
                            });
                          }}
                          title={marked ? "Annuler suppression" : "Marquer a supprimer"}
                          aria-label={marked ? "Annuler suppression" : "Marquer a supprimer"}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-[12px] text-gray-500" style={{ marginTop: 6 }}>
                  Aucun fichier
                </div>
              )}
            </div>
          ) : null}

          <label>Ajouter</label>
          <div
            className={`document-dropzone ${isDragOver ? "dragover" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              if (!prothesisId || isLocked) return;
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              if (!prothesisId || isLocked) return;
              setIsDragOver(false);
              addFilesAndUpload(e.dataTransfer?.files);
            }}
          >
            <UploadCloud size={28} />
            <p>Glissez-deposez vos fichiers ici</p>
            <span>ou</span>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <label className="document-import-btn" htmlFor={filesInputId}>
                Importer fichiers
              </label>
              <label className="document-import-btn" htmlFor={folderInputId}>
                Importer dossier
              </label>
            </div>

            <input
              id={filesInputId}
              key={`files-${inputKey}`}
              type="file"
              multiple
              accept={accept}
              onChange={(e) => addFilesAndUpload(e.target.files)}
              hidden
              disabled={!prothesisId || isLocked}
            />
            <input
              id={folderInputId}
              key={`folder-${inputKey}`}
              type="file"
              multiple
              webkitdirectory=""
              directory=""
              onChange={(e) => addFilesAndUpload(e.target.files)}
              hidden
              disabled={!prothesisId || isLocked}
            />

            <small>Types acceptes: {acceptLabel || "—"}</small>
            <small>Dossier: Chrome/Edge uniquement</small>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-primary2"
              disabled={!prothesisId || isLocked || hasActiveUploads}
              onClick={handleSave}
            >
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </button>

            <button type="button" className="btn-cancel" disabled={isLocked} onClick={handleCancel}>
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
