import React, { useEffect, useMemo, useRef, useState } from "react";
import { Headphones, MessageSquare, Edit3, Send, Search, Image as ImageIcon } from "react-feather";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import SortableTh from "../components/SortableTh";
import MetadataInfo from "../components/MetadataInfo";
import { getApiErrorMessage } from "../utils/error";
import { formatDateTimeByPreference } from "../utils/dateFormat";
import { adminListFeedback } from "../services/feedbackService";
import { adminGetThreadMessages, adminListSupportThreads, adminSendThreadImage, adminSendThreadMessage, getSupportAttachmentBlob } from "../services/supportService";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
import "./Patients.css";
import "./Patient.css";
import "./Support.css";

const AdminSupportCenter = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("support"); // support | feedback
  const [loading, setLoading] = useState(true);

  // Support (threads + messages)
  const [threadQuery, setThreadQuery] = useState("");
  const [threads, setThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [imagePreview, setImagePreview] = useState(null); // { url, alt }
  const chatEndRef = useRef(null);
  const chatScrollRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const forceScrollOnceRef = useRef(true);
  const fileInputRef = useRef(null);
  const [attachmentUrlsByMessageId, setAttachmentUrlsByMessageId] = useState({});
  const attachmentUrlsRef = useRef({});

  // Feedback list
  const [feedback, setFeedback] = useState([]);
  const [fbSortConfig, setFbSortConfig] = useState({ key: "createdAt", direction: SORT_DIRECTIONS.DESC });
  const handleFbSort = (key) => {
    setFbSortConfig((prev) => {
      if (!prev || prev.key !== key) return { key, direction: SORT_DIRECTIONS.ASC };
      return {
        key,
        direction: prev.direction === SORT_DIRECTIONS.ASC ? SORT_DIRECTIONS.DESC : SORT_DIRECTIONS.ASC,
      };
    });
  };

  const loadThreads = async () => {
    const data = await adminListSupportThreads(threadQuery);
    setThreads(Array.isArray(data) ? data : []);
  };

  const loadThreadMessages = async (threadId) => {
    const data = await adminGetThreadMessages(threadId);
    setMessages((prev) => {
      const pending = (Array.isArray(prev) ? prev : []).filter((m) => String(m?.id || "").startsWith("tmp-"));
      const server = Array.isArray(data) ? data : [];
      const serverIds = new Set(server.map((m) => String(m?.id)));
      const merged = [...server, ...pending.filter((m) => !serverIds.has(String(m?.id)))];
      return merged;
    });
  };

  const loadFeedback = async () => {
    const data = await adminListFeedback();
    setFeedback(Array.isArray(data) ? data : []);
  };

  const initLoad = async () => {
    try {
      setLoading(true);
      await Promise.all([loadThreads(), loadFeedback()]);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur de chargement"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initLoad();
  }, []);

  useEffect(() => {
    const shouldStick = stickToBottomRef.current || forceScrollOnceRef.current;
    if (!shouldStick) return;
    const forced = !!forceScrollOnceRef.current;
    forceScrollOnceRef.current = false;
    const el = chatScrollRef.current;
    if (!el) return;
    try {
      el.scrollTo({ top: el.scrollHeight, behavior: forced ? "auto" : "smooth" });
    } catch {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, selectedThreadId]);

  const selectedThread = useMemo(
    () => threads.find((t) => String(t.id) === String(selectedThreadId)) || null,
    [threads, selectedThreadId]
  );

  const sortedFeedback = useMemo(() => {
    const list = Array.isArray(feedback) ? [...feedback] : [];
    return sortRowsBy(list, fbSortConfig, {
      createdAt: (f) => f?.createdAt || null,
      category: (f) => f?.category || "",
      phoneNumber: (f) => f?.phoneNumber || "",
      clinicOwnerName: (f) => f?.clinicOwnerName || "",
    });
  }, [feedback, fbSortConfig]);

  const formatDateTime = (value) => {
    if (!value) return "—";
    const label = formatDateTimeByPreference(value);
    return label === "-" ? "—" : label;
  };

  const getDayKey = (value) => {
    const d = value ? new Date(value) : null;
    if (!d || Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
  };

  const formatDayLabel = (value) => {
    const d = value ? new Date(value) : null;
    if (!d || Number.isNaN(d.getTime())) return "";
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((today.getTime() - target.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    return target.toLocaleDateString("fr-FR", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
  };

  const formatTime = (value) => {
    const d = value ? new Date(value) : null;
    if (!d || Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatCategory = (category, customLabel) => {
    const c = String(category || "").toUpperCase();
    const map = {
      FEATURE_REQUEST: "Suggestion de fonctionnalité",
      BUG: "Bug",
      IMPROVEMENT: "Amélioration",
      QUESTION: "Question",
      BILLING: "Facturation / Paiement",
      ACCOUNT: "Compte / Connexion",
      PERFORMANCE: "Performance / Lenteur",
      DATA: "Données",
      UI_UX: "Interface / UX",
      OTHER: "Autre",
      CUSTOM: "Autre",
    };
    const base = map[c] || c || "—";
    if ((c === "OTHER" || c === "CUSTOM") && customLabel) return `${base} (${customLabel})`;
    return base;
  };

  useEffect(() => {
    attachmentUrlsRef.current = attachmentUrlsByMessageId;
  }, [attachmentUrlsByMessageId]);

  useEffect(() => {
    if (!selectedThreadId) return;
    const toLoad = (messages || [])
      .filter((m) => m?.attachmentUrl && !m?.attachmentLocalUrl && !attachmentUrlsRef.current[String(m.id)])
      .map((m) => ({ id: m.id, url: m.attachmentUrl }));

    if (toLoad.length === 0) return;
    let cancelled = false;

    (async () => {
      for (const item of toLoad) {
        try {
          const blob = await getSupportAttachmentBlob(item.url);
          if (cancelled) return;
          const objectUrl = URL.createObjectURL(blob);
          setAttachmentUrlsByMessageId((prev) => ({ ...(prev || {}), [String(item.id)]: objectUrl }));
        } catch {
          // ignore
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedThreadId, messages]);

  const handleSendAdminMessage = async (e) => {
    e.preventDefault();
    if (sendingChat) return;
    const content = String(chatText || "").trim();
    if (!content || !selectedThreadId) return;
    const tmpId = `tmp-${Date.now()}`;
    const nowIso = new Date().toISOString();
    try {
      setSendingChat(true);
      setMessages((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        {
          id: tmpId,
          threadId: selectedThreadId,
          senderId: null,
          senderRole: "ADMIN",
          senderName: "Admin",
          content,
          createdAt: nowIso,
          readByOther: false,
          clientStatus: "SENDING",
        },
      ]);
      const saved = await adminSendThreadMessage(selectedThreadId, content);
      setMessages((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        return list.map((m) => (String(m?.id) === String(tmpId) ? { ...saved, clientStatus: "SENT" } : m));
      });
      setChatText("");
      stickToBottomRef.current = true;
      await loadThreads();
    } catch (err) {
      setMessages((prev) => (Array.isArray(prev) ? prev : []).filter((m) => String(m?.id) !== String(tmpId)));
      setChatText(content);
      toast.error(getApiErrorMessage(err, "Erreur lors de l'envoi"));
    } finally {
      setSendingChat(false);
    }
  };

  const handlePickImage = () => {
    if (!selectedThreadId || sendingChat) return;
    fileInputRef.current?.click();
  };

  const handleImageSelected = async (e) => {
    const file = e?.target?.files?.[0];
    try {
      if (e?.target) e.target.value = "";
    } catch {
      // ignore
    }
    if (!file) return;
    if (!selectedThreadId) return;

    const tmpId = `tmp-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const localUrl = URL.createObjectURL(file);

    try {
      setSendingChat(true);
      setMessages((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        {
          id: tmpId,
          threadId: selectedThreadId,
          senderId: null,
          senderRole: "ADMIN",
          senderName: "Admin",
          content: "",
          createdAt: nowIso,
          readByOther: false,
          clientStatus: "SENDING",
          attachmentLocalUrl: localUrl,
          attachmentContentType: file.type,
          attachmentOriginalName: file.name,
        },
      ]);
      stickToBottomRef.current = true;

      const saved = await adminSendThreadImage(selectedThreadId, file);
      setMessages((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        return list.map((m) => (String(m?.id) === String(tmpId) ? { ...saved, clientStatus: "SENT", attachmentLocalUrl: localUrl } : m));
      });
      await loadThreads();
    } catch (err) {
      try {
        URL.revokeObjectURL(localUrl);
      } catch {
        // ignore
      }
      setMessages((prev) => (Array.isArray(prev) ? prev : []).filter((m) => String(m?.id) !== String(tmpId)));
      toast.error(getApiErrorMessage(err, "Erreur lors de l'envoi de l'image"));
    } finally {
      setSendingChat(false);
    }
  };

  if (loading) {
    return <DentistPageSkeleton title="Support" subtitle="Chargement" variant="table" />;
  }

  return (
    <div className="patients-container">
      <PageHeader
        title="Support & Feedback"
        subtitle="Conversations + feedback utilisateurs"
        icon={<Headphones size={22} />}
      />

      <div className="tab-buttons" style={{ marginBottom: 14 }}>
        <button className={activeTab === "support" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("support")}>
          <MessageSquare size={16} /> Customer support
        </button>
        <button className={activeTab === "feedback" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("feedback")}>
          <Edit3 size={16} /> Feedback
        </button>
      </div>

      {activeTab === "support" && (
        <div className="cp-admin-support-grid">
          {/* Threads list */}
          <div className="cp-admin-support-panel">
            <div className="cp-admin-support-panel-header">
              <div className="flex gap-2 items-center">
                <Search size={16} />
                <input
                  value={threadQuery}
                  onChange={(e) => setThreadQuery(e.target.value)}
                  placeholder="Rechercher (nom, clinique, téléphone)…"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
                <button
                  type="button"
                  className="btn-secondary-app"
                  onClick={async () => {
                    try {
                      await loadThreads();
                    } catch (err) {
                      toast.error(getApiErrorMessage(err, "Erreur"));
                    }
                  }}
                >
                  OK
                </button>
              </div>
            </div>

            <div className="cp-admin-support-panel-body">
              {(threads || []).length === 0 ? (
                <div className="p-3 text-sm text-gray-600">Aucune conversation.</div>
              ) : (
                threads.map((t) => {
                  const active = String(t.id) === String(selectedThreadId);
                  const title = t.clinicName || t.clinicOwnerName || t.phoneNumber || `Thread #${t.id}`;
                  const preview = t.lastMessagePreview || "";
                  const actorRole = String(t?.lastClinicSenderRole || "").toUpperCase();
                  const roleLabel =
                    actorRole === "EMPLOYEE" ? "Employé" :
                    actorRole === "DENTIST" ? "Dentiste" :
                    actorRole || "Utilisateur";
                  const actorName = t?.lastClinicSenderName || t?.lastClinicSenderPhoneNumber || "";
                  const isStaff =
                    t?.lastClinicSenderId != null &&
                    t?.clinicOwnerId != null &&
                    String(t.lastClinicSenderId) !== String(t.clinicOwnerId);
                  const employer = isStaff ? (t?.clinicOwnerName || t?.clinicName || "") : "";
                  const actorMeta = actorName ? `${roleLabel}: ${actorName}` : roleLabel;
                  const employerMeta = employer ? ` • Employeur: ${employer}` : "";
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={async () => {
                        setSelectedThreadId(t.id);
                        forceScrollOnceRef.current = true;
                        try {
                          await loadThreadMessages(t.id);
                        } catch (err) {
                          toast.error(getApiErrorMessage(err, "Impossible de charger la conversation"));
                        }
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: 12,
                        border: "none",
                        borderBottom: "1px solid #e5e7eb",
                        background: active ? "#e0f2fe" : "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 800, fontSize: 13, color: "#111827" }}>{title}</div>
                        {Number(t?.unreadCount || 0) > 0 ? (
                          <span className="cp-unread-pill">{Number(t.unreadCount) > 99 ? "99+" : Number(t.unreadCount)}</span>
                        ) : null}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{preview}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                        {actorMeta}{employerMeta}
                      </div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{formatDateTime(t.lastMessageAt)}</div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Conversation */}
          <div className="cp-admin-support-panel">
            <div className="cp-admin-support-panel-header">
              <div style={{ fontWeight: 800 }}>
                {selectedThread ? (selectedThread.clinicName || selectedThread.clinicOwnerName || selectedThread.phoneNumber) : "Sélectionnez une conversation"}
              </div>
              {selectedThread?.phoneNumber ? <div className="text-sm text-gray-600">{selectedThread.phoneNumber}</div> : null}
              {selectedThread ? (() => {
                const actorRole = String(selectedThread?.lastClinicSenderRole || "").toUpperCase();
                const roleLabel =
                  actorRole === "EMPLOYEE" ? "Employé" :
                  actorRole === "DENTIST" ? "Dentiste" :
                  actorRole || "Utilisateur";
                const actorName = selectedThread?.lastClinicSenderName || selectedThread?.lastClinicSenderPhoneNumber || "";
                const isStaff =
                  selectedThread?.lastClinicSenderId != null &&
                  selectedThread?.clinicOwnerId != null &&
                  String(selectedThread.lastClinicSenderId) !== String(selectedThread.clinicOwnerId);
                const employer = isStaff ? (selectedThread?.clinicOwnerName || selectedThread?.clinicName || "") : "";
                const meta = actorName ? `${roleLabel}: ${actorName}` : roleLabel;
                const employerMeta = employer ? ` • Employeur: ${employer}` : "";
                return <div className="text-xs text-gray-500">{meta}{employerMeta}</div>;
              })() : null}
            </div>

            <div
              ref={chatScrollRef}
              onScroll={(e) => {
                const el = e.currentTarget;
                const distance = el.scrollHeight - (el.scrollTop + el.clientHeight);
                stickToBottomRef.current = distance <= 80;
              }}
              className="cp-admin-support-chat-body"
            >
              {!selectedThreadId ? (
                <div className="text-sm text-gray-600">Cliquez une conversation à gauche.</div>
              ) : (messages || []).length === 0 ? (
                <div className="text-sm text-gray-600">Aucun message.</div>
              ) : (
                (messages || []).map((m, idx) => {
                  const isAdmin = String(m.senderRole || "").toUpperCase() === "ADMIN";
                  const isMine = isAdmin;
                  const isSending = String(m?.clientStatus || "").toUpperCase() === "SENDING";
                  const isRead = !!m.readByOther;
                  const checkColor = isRead ? "#3498db" : "#94a3b8"; // app blue / grey
                  const checkLabel = isSending ? "✓" : "✓✓"; // sent (single) / received+read (double)
                  const attachmentUrl = m?.attachmentLocalUrl || attachmentUrlsByMessageId[String(m?.id)];
                  const dayKey = getDayKey(m?.createdAt);
                  const prevDayKey = getDayKey((messages || [])?.[idx - 1]?.createdAt);
                  const showDay = !!dayKey && dayKey !== prevDayKey;
                  const timeLabel = formatTime(m?.createdAt);
                  return (
                    <div key={m.id}>
                      {showDay ? (
                        <div className="cp-day-sep cp-day-sep--sticky">
                          <span>{formatDayLabel(m?.createdAt)}</span>
                        </div>
                      ) : null}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: isAdmin ? "flex-end" : "flex-start",
                          marginBottom: 10,
                        }}
                      >
                        <div
                          style={{
                          maxWidth: "78%",
                          padding: "10px 12px",
                          borderRadius: 14,
                          background: isMine ? "#dcf8c6" : "#ffffff",
                          border: "1px solid " + (isMine ? "#b7e4a8" : "#e5e7eb"),
                          }}
                        >
                        {attachmentUrl ? (
                          <button
                            type="button"
                            className="cp-chat-image-btn"
                            onClick={() => setImagePreview({ url: attachmentUrl, alt: m?.attachmentOriginalName || "image" })}
                            aria-label="Ouvrir l'image"
                          >
                            <img
                              src={attachmentUrl}
                              alt={m?.attachmentOriginalName || "image"}
                              className="cp-chat-image-thumb"
                              loading="lazy"
                            />
                          </button>
                        ) : null}
                        {String(m.content || "").trim() ? (
                          <div style={{ fontSize: 13, lineHeight: 1.35, wordBreak: "break-word", whiteSpace: "pre-wrap", marginTop: attachmentUrl ? 8 : 0 }}>
                            {m.content}
                          </div>
                        ) : null}
                        <div style={{ marginTop: 6, fontSize: 11, color: "#6b7280", display: "flex", justifyContent: "flex-end", gap: 6, alignItems: "center" }}>
                          <span>{timeLabel}</span>
                          {isMine ? <span className="cp-msg-checks" style={{ color: checkColor }}>{checkLabel}</span> : null}
                        </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendAdminMessage} className="cp-admin-support-chat-footer flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImageSelected}
              />
              <button type="button" className="btn-secondary-app cp-icon-btn" onClick={handlePickImage} disabled={!selectedThreadId || sendingChat}>
                <ImageIcon size={18} />
              </button>
              <input
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Répondre…"
                className="w-full px-4 py-3 rounded-xl border border-gray-300"
                maxLength={2000}
                disabled={!selectedThreadId}
              />
              <button
                type="submit"
                className="btn-primary2 cp-icon-btn"
                aria-label="Envoyer"
                disabled={!selectedThreadId || sendingChat || !String(chatText || "").trim()}
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === "feedback" && (
        <div>
          <table className="treatment-table">
            <thead>
              <tr>
                <SortableTh label="created_at" sortKey="createdAt" sortConfig={fbSortConfig} onSort={handleFbSort} />
                <SortableTh label="Catégorie" sortKey="category" sortConfig={fbSortConfig} onSort={handleFbSort} />
                <SortableTh label="Utilisateur" sortKey="clinicOwnerName" sortConfig={fbSortConfig} onSort={handleFbSort} />
                <SortableTh label="Téléphone" sortKey="phoneNumber" sortConfig={fbSortConfig} onSort={handleFbSort} />
                <th>Voir</th>
              </tr>
            </thead>
            <tbody>
              {sortedFeedback.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-gray-500 py-4">
                    Aucun feedback
                  </td>
                </tr>
              ) : (
                sortedFeedback.map((f) => (
                  <tr
                    key={f.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/admin/support/feedback/${f.id}`)}
                  >
                    <td>
                      <div className="flex items-center gap-2">
                        <span>{formatDateTime(f.createdAt)}</span>
                        <MetadataInfo entity={f} />
                      </div>
                    </td>
                    <td>{formatCategory(f.category, f.customCategoryLabel)}</td>
                    <td>{f.clinicOwnerName || "—"}</td>
                    <td>{f.phoneNumber || "—"}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-secondary-app"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate(`/admin/support/feedback/${f.id}`);
                        }}
                      >
                        Ouvrir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {imagePreview?.url ? (
        <div
          className="cp-image-preview-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setImagePreview(null)}
        >
          <button
            type="button"
            className="cp-image-preview-close"
            onClick={(e) => {
              e.stopPropagation();
              setImagePreview(null);
            }}
          >
            Fermer
          </button>
          <img
            src={imagePreview.url}
            alt={imagePreview.alt || "image"}
            className="cp-image-preview-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
};

export default AdminSupportCenter;
