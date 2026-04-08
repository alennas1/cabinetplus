import React, { useEffect, useMemo, useRef, useState } from "react";
import { Send, Image as ImageIcon } from "react-feather";
import { toast } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import PageHeader from "../components/PageHeader";
import BackButton from "../components/BackButton";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import ModernDropdown from "../components/ModernDropdown";
import { getApiErrorMessage } from "../utils/error";
import { formatDateTimeByPreference } from "../utils/dateFormat";
import { createFeedback } from "../services/feedbackService";
import { createMySupportThread, getMyThreadMessages, listMySupportThreads, markMySupportThreadsRead, sendMyThreadImage, sendMyThreadMessage, getSupportAttachmentBlob } from "../services/supportService";
import "./Patients.css";
import "./Patient.css";
import "./Support.css";

const FEEDBACK_CATEGORIES = [
  { value: "FEATURE_REQUEST", label: "Suggestion de fonctionnalité" },
  { value: "BUG", label: "Bug" },
  { value: "IMPROVEMENT", label: "Amélioration" },
  { value: "QUESTION", label: "Question" },
  { value: "BILLING", label: "Facturation / Paiement" },
  { value: "ACCOUNT", label: "Compte / Connexion" },
  { value: "PERFORMANCE", label: "Performance / Lenteur" },
  { value: "DATA", label: "Données (import / sauvegarde)" },
  { value: "UI_UX", label: "Interface / UX" },
  { value: "OTHER", label: "Autre" },
];

const SupportCenter = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useSelector((state) => state.auth || {});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("support");

  // Support chat
  const [threads, setThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [messageQuery, setMessageQuery] = useState("");
  const [imagePreview, setImagePreview] = useState(null); // { url, alt }
  const chatEndRef = useRef(null);
  const pollRef = useRef(null);
  const chatScrollRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const forceScrollOnceRef = useRef(true);
  const wsRef = useRef(null);
  const wsReconnectRef = useRef(null);
  const selectedThreadIdRef = useRef(null);
  const fileInputRef = useRef(null);
  const [attachmentUrlsByMessageId, setAttachmentUrlsByMessageId] = useState({});
  const attachmentUrlsRef = useRef({});
  const prevMsgCountRef = useRef(0);
  const [newMsgCount, setNewMsgCount] = useState(0);

  // Feedback form
  const [fbCategory, setFbCategory] = useState("FEATURE_REQUEST");
  const [fbCustomLabel, setFbCustomLabel] = useState("");
  const [fbMessage, setFbMessage] = useState("");
  const [sendingFb, setSendingFb] = useState(false);

  const sortedMessages = useMemo(() => {
    const list = Array.isArray(messages) ? [...messages] : [];
    list.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    return list;
  }, [messages]);

  const selectedThread = useMemo(() => {
    const list = Array.isArray(threads) ? threads : [];
    if (selectedThreadId) {
      return list.find((t) => String(t?.id || "") === String(selectedThreadId)) || null;
    }
    return list[0] || null;
  }, [threads, selectedThreadId]);

  const filteredMessages = useMemo(() => {
    const q = String(messageQuery || "").trim().toLowerCase();
    const list = Array.isArray(sortedMessages) ? sortedMessages : [];
    if (!q) return list;
    return list.filter((m) => String(m?.content || "").toLowerCase().includes(q));
  }, [sortedMessages, messageQuery]);

  useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
  }, [selectedThreadId]);

  const buildMessagingWsUrl = () => {
    const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/+$/, "");
    const wsBase = apiBase.startsWith("https://")
      ? apiBase.replace(/^https:\/\//, "wss://")
      : apiBase.replace(/^http:\/\//, "ws://");
    return `${wsBase}/ws/messaging?token=${encodeURIComponent(String(token || ""))}`;
  };

  const upsertThreadSummary = (prev, summary) => {
    const next = Array.isArray(prev) ? [...prev] : [];
    const id = String(summary?.id || "");
    if (!id) return next;
    const idx = next.findIndex((t) => String(t?.id || "") === id);
    if (idx >= 0) {
      next[idx] = { ...next[idx], ...summary };
      return next;
    }
    return [summary, ...next];
  };

  const upsertMessage = (prev, msg) => {
    const next = Array.isArray(prev) ? [...prev] : [];
    const id = String(msg?.id || "");
    if (!id) return next;
    if (next.some((m) => String(m?.id || "") === id)) return next;
    next.push(msg);
    next.sort((a, b) => new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0));
    return next;
  };

  const loadThreads = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const data = await listMySupportThreads();
      const list = Array.isArray(data) ? data : [];
      setThreads(list);
      return list;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Impossible de charger la conversation"));
      return [];
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const ensureSingleThread = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      let list = await listMySupportThreads();
      list = Array.isArray(list) ? list : [];
      let thread = list?.[0] || null;
      if (!thread) {
        thread = await createMySupportThread();
        list = thread ? [thread] : [];
      }

      setThreads(list);

      const nextId = thread?.id || null;
      if (nextId) {
        setSelectedThreadId(nextId);
        forceScrollOnceRef.current = true;
        await loadSelectedMessages(nextId, { silent: true });
      } else {
        setSelectedThreadId(null);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Impossible de charger la conversation"));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadSelectedMessages = async (threadId, { silent = false } = {}) => {
    const idToUse = threadId ?? selectedThreadId;
    if (!idToUse) return;
    try {
      const data = await getMyThreadMessages(idToUse);
      setMessages((prev) => {
        const pending = (Array.isArray(prev) ? prev : []).filter((m) => String(m?.id || "").startsWith("tmp-"));
        const server = Array.isArray(data) ? data : [];
        const serverIds = new Set(server.map((m) => String(m?.id)));
        const merged = [...server, ...pending.filter((m) => !serverIds.has(String(m?.id)))];
        return merged;
      });
    } catch (err) {
      if (!silent) toast.error(getApiErrorMessage(err, "Impossible de charger la conversation"));
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await markMySupportThreadsRead();
      } catch {
        // ignore
      }
      await ensureSingleThread();
    })();
  }, []);

  useEffect(() => {
    if (!token) return;

    let disposed = false;

    const cleanupSocket = () => {
      if (wsReconnectRef.current) {
        clearTimeout(wsReconnectRef.current);
        wsReconnectRef.current = null;
      }
      try {
        wsRef.current?.close?.(1000, "page_unload");
      } catch {
        // ignore
      } finally {
        wsRef.current = null;
      }
    };

    const connect = () => {
      cleanupSocket();
      const url = buildMessagingWsUrl();
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (disposed) return;
        setWsConnected(true);
      };

      ws.onclose = () => {
        if (disposed) return;
        setWsConnected(false);
        wsReconnectRef.current = setTimeout(() => {
          if (!disposed) connect();
        }, 1500);
      };

      ws.onmessage = (event) => {
        if (disposed) return;
        let data = null;
        try {
          data = JSON.parse(event?.data || "null");
        } catch {
          return;
        }
        if (!data || !data.type) return;

        if (data.type !== "SUPPORT_MESSAGE_CREATED" && data.type !== "SUPPORT_THREAD_UPDATED" && data.type !== "SUPPORT_CLAIM_UPDATED") {
          return;
        }

        const summary = data.thread || null;
        const msg = data.message || null;
        const currentThreadId = selectedThreadIdRef.current;

        if (summary?.id) {
          setThreads((prev) => upsertThreadSummary(prev, summary));
        }

        if (msg?.threadId && currentThreadId && String(msg.threadId) === String(currentThreadId) && data.type !== "SUPPORT_THREAD_UPDATED") {
          setMessages((prev) => upsertMessage(prev, msg));
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      cleanupSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      if (!selectedThreadId) {
        await ensureSingleThread({ silent: true });
        return;
      }
      await loadSelectedMessages(selectedThreadId, { silent: true });
    }, selectedThreadId ? 4000 : 12000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [selectedThreadId]);

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
  }, [sortedMessages.length]);

  useEffect(() => {
    const prevCount = prevMsgCountRef.current || 0;
    const nextCount = sortedMessages.length;
    prevMsgCountRef.current = nextCount;

    if (!selectedThreadId) {
      setNewMsgCount(0);
      return;
    }

    if (nextCount <= prevCount) return;
    const delta = nextCount - prevCount;
    const atBottom = stickToBottomRef.current || forceScrollOnceRef.current;
    if (atBottom) {
      setNewMsgCount(0);
      return;
    }

    const tail = sortedMessages.slice(-delta);
    const fromOther = tail.filter((m) => String(m?.senderRole || "").toUpperCase() === "ADMIN").length;
    if (fromOther > 0) setNewMsgCount((c) => c + fromOther);
  }, [selectedThreadId, sortedMessages]);

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

  useEffect(() => {
    attachmentUrlsRef.current = attachmentUrlsByMessageId;
  }, [attachmentUrlsByMessageId]);

  useEffect(() => {
    if (!selectedThreadId) return;
    const toLoad = (sortedMessages || [])
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
          // ignore: keep message without preview
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedThreadId, sortedMessages]);

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (sendingChat) return;
    const content = String(chatText || "").trim();
    if (!content) return;
    if (!selectedThreadId) return;
    const tmpId = `tmp-${Date.now()}`;
    const nowIso = new Date().toISOString();
    try {
      setSendingChat(true);
      setMessages((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        {
          id: tmpId,
          threadId: null,
          senderId: null,
          senderRole: "DENTIST",
          senderName: "Moi",
          content,
          createdAt: nowIso,
          readByOther: false,
          clientStatus: "SENDING",
        },
      ]);
      setChatText("");
      stickToBottomRef.current = true;
      const saved = await sendMyThreadMessage(selectedThreadId, content);
      setMessages((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        const replaced = list.map((m) => (String(m?.id) === String(tmpId) ? { ...saved, clientStatus: "SENT" } : m));
        return replaced;
      });
    } catch (err) {
      setMessages((prev) => (Array.isArray(prev) ? prev : []).filter((m) => String(m?.id) !== String(tmpId)));
      setChatText(content);
      toast.error(getApiErrorMessage(err, "Erreur lors de l'envoi du message"));
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
          senderRole: "DENTIST",
          senderName: "Moi",
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

      const saved = await sendMyThreadImage(selectedThreadId, file);
      setMessages((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        return list.map((m) => {
          if (String(m?.id) !== String(tmpId)) return m;
          return { ...saved, clientStatus: "SENT", attachmentLocalUrl: localUrl };
        });
      });
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

  const handleSendFeedback = async (e) => {
    e.preventDefault();
    if (sendingFb) return;

    const message = String(fbMessage || "").trim();
    if (!message) {
      toast.error("Écrivez votre feedback.");
      return;
    }

    const payload = {
      category: fbCategory,
      customCategoryLabel: fbCategory === "OTHER" ? String(fbCustomLabel || "").trim() : null,
      message,
    };

    try {
      setSendingFb(true);
      await createFeedback(payload);
      toast.success("Feedback envoyé !");
      setFbMessage("");
      setFbCustomLabel("");
      setFbCategory("FEATURE_REQUEST");
      // keep layout; no tab switch
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de l'envoi du feedback"));
    } finally {
      setSendingFb(false);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "";
    const label = formatDateTimeByPreference(value);
    return label === "-" ? "" : label;
  };

  if (loading) {
    return (
      <DentistPageSkeleton
        title="Support"
        subtitle="Chargement"
        variant="table"
      />
    );
  }

  return (
    <div className="patients-container">
      <BackButton fallbackTo="/dashboard" />
      <PageHeader
        title="Support & Feedback"
        subtitle="Contactez l’admin et envoyez vos suggestions"
      />

      <div className="cp-support-content">
        <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div className="tab-buttons" style={{ marginBottom: 0 }}>
            <button
              type="button"
              className={activeTab === "support" ? "tab-btn active" : "tab-btn"}
              onClick={() => setActiveTab("support")}
            >
              Support
            </button>
            <button
              type="button"
              className={activeTab === "feedback" ? "tab-btn active" : "tab-btn"}
              onClick={() => setActiveTab("feedback")}
            >
              Feedback
            </button>
          </div>
        </div>
        {/* Support */}
        <div className="controls-card cp-support-panel" hidden={activeTab !== "support"}>
          <div className="cp-support-panel-body">
            {!selectedThreadId ? (
              <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div className="text-sm text-gray-600">Choisissez une conversation ou créez-en une nouvelle.</div>
                <button
                  type="button"
                  className="btn-primary2"
                  style={{ display: "none" }}
                  onClick={async () => {
                    try {
                      const created = await createMySupportThread();
                      await loadThreads({ silent: true });
                      setSelectedThreadId(created?.id || null);
                      forceScrollOnceRef.current = true;
                      await loadSelectedMessages(created?.id || null, { silent: true });
                    } catch (err) {
                      toast.error(getApiErrorMessage(err, "Impossible de créer la conversation"));
                    }
                  }}
                >
                  + Nouvelle conversation
                </button>
              </div>

              <div className="cp-chat-box" style={{ padding: 0 }}>
                {(threads || []).length === 0 ? (
                  <div style={{ padding: 12 }} className="text-sm text-gray-600">Aucune conversation.</div>
                ) : (
                  <div>
                    {(threads || []).map((t) => {
                      const title = t.firstMessagePreview || t.lastMessagePreview || "Conversation";
                      const date = t.lastMessageAt || t.createdAt;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={async () => {
                            setSelectedThreadId(t.id);
                            forceScrollOnceRef.current = true;
                            await loadSelectedMessages(t.id, { silent: false });
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: 12,
                            border: "none",
                            borderBottom: "1px solid #e5e7eb",
                            background: "#fff",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                            <div style={{ fontWeight: 800, fontSize: 13, color: "#111827" }}>{title}</div>
                            {Number(t?.unreadCount || 0) > 0 ? (
                              <span className="cp-unread-pill">{Number(t.unreadCount) > 99 ? "99+" : Number(t.unreadCount)}</span>
                            ) : null}
                          </div>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{formatDateTime(date)}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              </>
            ) : (
              <>
              <div style={{ display: "none", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <button
                  type="button"
                  className="btn-secondary-app"
                  onClick={() => {
                    setSelectedThreadId(null);
                    setMessages([]);
                    setChatText("");
                  }}
                >
                  Retour
                </button>
               </div>

               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
                 <div className="text-xs text-gray-600">
                   {selectedThread?.claimedByAdminName
                     ? `Agent: ${selectedThread.claimedByAdminName}`
                      : "En attente d'un agent..."}
                 </div>
                 <div className="text-xs text-gray-400">{wsConnected ? "WS" : "offline"}</div>
               </div>

               <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                 <input
                   value={messageQuery}
                   onChange={(e) => setMessageQuery(e.target.value)}
                   placeholder="Search in conversation..."
                   className="w-full px-3 py-2 rounded-xl border border-gray-300"
                 />
                 {messageQuery ? (
                   <button type="button" className="btn-secondary-app" onClick={() => setMessageQuery("")}>
                     Clear
                   </button>
                 ) : null}
               </div>

               <div
                 ref={chatScrollRef}
                 onScroll={(e) => {
                   const el = e.currentTarget;
                  const distance = el.scrollHeight - (el.scrollTop + el.clientHeight);
                  stickToBottomRef.current = distance <= 80;
                  if (stickToBottomRef.current) setNewMsgCount(0);
                }}
                className="cp-chat-box"
              >
                {filteredMessages.length === 0 ? (
                  <div className="text-sm text-gray-600">Dites bonjour à l’admin.</div>
                ) : (
                  filteredMessages.map((m, idx) => {
                    const isSystem = String(m?.kind || "").toUpperCase() === "SYSTEM";
                    const isAdmin = String(m.senderRole || "").toUpperCase() === "ADMIN";
                    const isMine = !isAdmin;
                    const isSending = String(m?.clientStatus || "").toUpperCase() === "SENDING";
                    const isRead = !!m.readByOther;
                    const checkColor = isRead ? "#3498db" : "#94a3b8";
                    const checkLabel = isSending ? "✓" : "✓✓";
                     const attachmentUrl = m?.attachmentLocalUrl || attachmentUrlsByMessageId[String(m?.id)];
                     const dayKey = getDayKey(m?.createdAt);
                     const prevDayKey = getDayKey(filteredMessages?.[idx - 1]?.createdAt);
                     const showDay = !!dayKey && dayKey !== prevDayKey;
                     const timeLabel = formatTime(m?.createdAt);

                     if (isSystem) {
                       return (
                         <div key={m.id}>
                           {showDay ? (
                             <div className="cp-day-sep cp-day-sep--sticky">
                               <span>{formatDayLabel(m?.createdAt)}</span>
                             </div>
                           ) : null}
                           <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                             <div
                               style={{
                                 fontSize: 12,
                                 color: "#475569",
                                 background: "#f1f5f9",
                                 border: "1px solid #e2e8f0",
                                 padding: "6px 10px",
                                 borderRadius: 999,
                                 maxWidth: "92%",
                                 textAlign: "center",
                                 wordBreak: "break-word",
                               }}
                             >
                               {String(m.content || "").trim()}
                             </div>
                           </div>
                         </div>
                       );
                     }
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
                             justifyContent: isAdmin ? "flex-start" : "flex-end",
                             marginBottom: 10,
                           }}
                         >
                           <div
                             style={{
                             maxWidth: "78%",
                             padding: "10px 12px",
                             borderRadius: 14,
                               background: isMine ? "#dcf8c6" : "#f3f4f6",
                               border: "1px solid " + (isMine ? "#b7e4a8" : "#e5e7eb"),
                              color: "#111827",
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

                {newMsgCount > 0 ? (
                  <div className="cp-new-msg-banner" aria-live="polite">
                    <button
                      type="button"
                      onClick={() => {
                        const el = chatScrollRef.current;
                        if (!el) return;
                        stickToBottomRef.current = true;
                        setNewMsgCount(0);
                        try {
                          el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
                        } catch {
                          el.scrollTop = el.scrollHeight;
                        }
                      }}
                    >
                      {newMsgCount} nouveau{newMsgCount > 1 ? "x" : ""} message{newMsgCount > 1 ? "s" : ""} - Aller en bas
                    </button>
                  </div>
                ) : null}
              </div>

              <form onSubmit={handleSendChat} className="flex gap-2" style={{ marginTop: 12 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleImageSelected}
                />
                <button type="button" className="btn-secondary-app cp-icon-btn" onClick={handlePickImage} disabled={sendingChat}>
                  <ImageIcon size={18} />
                </button>
                <input
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder="Écrire un message…"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  maxLength={2000}
                />
                <button type="submit" className="btn-primary2 cp-icon-btn" aria-label="Envoyer" disabled={sendingChat || !String(chatText || "").trim()}>
                  <Send size={16} />
                </button>
              </form>
              </>
            )}
          </div>
        </div>

        {/* Feedback */}
        <div className="controls-card cp-support-panel" hidden={activeTab !== "feedback"}>
          <div className="cp-support-panel-title">Feedback</div>

          <div className="cp-support-panel-body">
            <div className="cp-feedback-box">
              <form
                onSubmit={handleSendFeedback}
                className="modal-form"
                noValidate
                style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
              >
                <label className="field-label">Catégorie</label>
                <ModernDropdown
                  value={fbCategory}
                  onChange={(v) => {
                    setFbCategory(String(v || ""));
                    if (String(v) !== "OTHER") setFbCustomLabel("");
                  }}
                  options={FEEDBACK_CATEGORIES}
                  ariaLabel="Catégorie"
                  fullWidth
                />

                {fbCategory === "OTHER" && (
                  <>
                    <label className="field-label">Précisez (Autre)</label>
                    <input
                      value={fbCustomLabel}
                      onChange={(e) => setFbCustomLabel(e.target.value)}
                      placeholder="Ex: Impression, Intégration, Rapport…"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300"
                      maxLength={80}
                    />
                  </>
                )}

                <label className="field-label">Message</label>
              <textarea
                value={fbMessage}
                onChange={(e) => setFbMessage(e.target.value)}
                placeholder="Décrivez votre idée / problème…"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 cp-feedback-textarea focus:outline-none focus:ring-0"
                maxLength={5000}
                style={{
                  resize: "none",
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                }}
              />

              <div className="modal-actions" style={{ marginTop: "auto", paddingTop: 12 }}>
                <button type="submit" className="btn-primary2" disabled={sendingFb}>
                  {sendingFb ? "Envoi..." : "Envoyer"}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      </div>

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

export default SupportCenter;
