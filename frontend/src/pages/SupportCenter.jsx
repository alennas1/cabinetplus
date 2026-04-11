import React, { useEffect, useMemo, useRef, useState } from "react";
import { Send, Image as ImageIcon, MoreVertical, Search, X, ChevronUp, ChevronDown } from "react-feather";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import PageHeader from "../components/PageHeader";
import BackButton from "../components/BackButton";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import ModernDropdown from "../components/ModernDropdown";
import { getApiErrorMessage } from "../utils/error";
import { formatDateTimeByPreference } from "../utils/dateFormat";
import { createFeedback } from "../services/feedbackService";
import { getAccessToken } from "../services/authService";
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
  const { token } = useSelector((state) => state.auth || {});
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("support");

  // Support chat
  const [threads, setThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [messageQuery, setMessageQuery] = useState("");
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);
  const [threadMenuOpen, setThreadMenuOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState(null); // { url, alt }
  const chatEndRef = useRef(null);
  const pollRef = useRef(null);
  const chatScrollRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const forceScrollOnceRef = useRef(true);
  const wsRef = useRef(null);
  const wsReconnectRef = useRef(null);
  const selectedThreadIdRef = useRef(null);
  const threadMenuRef = useRef(null);
  const messageSearchInputRef = useRef(null);
  const messageRefs = useRef({});
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

  const claimedByFirstName = useMemo(() => {
    const raw = String(selectedThread?.claimedByAdminName || "").trim();
    if (!raw) return "";
    return raw.split(/\s+/)[0] || "";
  }, [selectedThread?.claimedByAdminName]);

  const messageNeedle = useMemo(() => String(messageQuery || "").trim().toLowerCase(), [messageQuery]);
  const requestedThreadIdFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search || "");
    const raw = String(params.get("thread") || "").trim();
    return raw || null;
  }, [location.search]);

  const matchMessageIds = useMemo(() => {
    if (!messageNeedle) return [];
    return (Array.isArray(sortedMessages) ? sortedMessages : [])
      .filter((m) => String(m?.content || "").toLowerCase().includes(messageNeedle))
      .map((m) => String(m?.id || ""))
      .filter(Boolean);
  }, [sortedMessages, messageNeedle]);

  const renderHighlighted = (text, needle) => {
    const raw = String(text || "");
    const q = String(needle || "").trim();
    if (!q) return raw;
    const lower = raw.toLowerCase();
    const lowerQ = q.toLowerCase();

    const parts = [];
    let i = 0;
    while (i < raw.length) {
      const idx = lower.indexOf(lowerQ, i);
      if (idx < 0) {
        parts.push({ t: raw.slice(i), hit: false });
        break;
      }
      if (idx > i) parts.push({ t: raw.slice(i, idx), hit: false });
      parts.push({ t: raw.slice(idx, idx + q.length), hit: true });
      i = idx + q.length;
    }

    return (
      <>
        {parts.map((p, idx) =>
          p.hit ? (
            <span key={idx} style={{ background: "#fde68a", borderRadius: 6, padding: "0 4px" }}>
              {p.t}
            </span>
          ) : (
            <React.Fragment key={idx}>{p.t}</React.Fragment>
          )
        )}
      </>
    );
  };

  useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
  }, [selectedThreadId]);

  useEffect(() => {
    if (!threadMenuOpen) return;
    const onMouseDown = (event) => {
      if (!threadMenuRef.current) return;
      if (!threadMenuRef.current.contains(event.target)) setThreadMenuOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setThreadMenuOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [threadMenuOpen]);

  useEffect(() => {
    if (!messageSearchOpen) return;
    try {
      setTimeout(() => messageSearchInputRef.current?.focus?.(), 0);
    } catch {
      // ignore
    }
  }, [messageSearchOpen, selectedThreadId]);

  useEffect(() => {
    if (selectedThreadId) return;
    setThreadMenuOpen(false);
  }, [selectedThreadId]);

  useEffect(() => {
    if (!messageNeedle) {
      setActiveMatchIndex(-1);
      return;
    }
    // Reset to first match whenever query changes.
    setActiveMatchIndex(matchMessageIds.length > 0 ? 0 : -1);
  }, [messageNeedle, matchMessageIds.length]);

  useEffect(() => {
    if (activeMatchIndex < 0) return;
    const id = matchMessageIds[activeMatchIndex];
    if (!id) return;
    const el = messageRefs.current[id];
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch {
      // ignore
    }
  }, [activeMatchIndex, matchMessageIds]);

  const openMessageSearch = () => {
    if (!selectedThreadId) {
      toast.info("Choisissez une conversation");
      return;
    }
    setThreadMenuOpen(false);
    setMessageSearchOpen(true);
  };

  const closeMessageSearch = () => {
    setMessageSearchOpen(false);
    setMessageQuery("");
    setActiveMatchIndex(-1);
  };

  const jumpMatch = (delta) => {
    if (!messageNeedle) return;
    const total = matchMessageIds.length;
    if (total <= 0) return;
    setActiveMatchIndex((prev) => {
      const current = prev < 0 ? 0 : prev;
      const next = (current + delta + total) % total;
      return next;
    });
  };

  const buildMessagingWsUrl = () => {
    const accessToken = getAccessToken();
    if (!accessToken) return null;
    const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/+$/, "");
    const wsBase = apiBase.startsWith("https://")
      ? apiBase.replace(/^https:\/\//, "wss://")
      : apiBase.replace(/^http:\/\//, "ws://");
    return `${wsBase}/ws/messaging?token=${encodeURIComponent(String(accessToken))}`;
  };

  const upsertThreadSummary = (prev, summary) => {
    const id = String(summary?.id || "");
    const next = Array.isArray(prev) ? [...prev] : [];
    if (!id) return next.slice(0, 1);

    // Support center for users exposes a single thread.
    if (next.length === 0) return [summary];
    const currentId = String(next?.[0]?.id || "");
    if (currentId && currentId !== id) return next.slice(0, 1);

    next[0] = { ...(next[0] || {}), ...summary };
    return next.slice(0, 1);
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

  const ensureSingleThread = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      let list = await listMySupportThreads();
      list = Array.isArray(list) ? list : [];

      let thread = null;
      if (requestedThreadIdFromQuery) {
        thread = list.find((t) => String(t?.id || "") === String(requestedThreadIdFromQuery)) || null;
      }
      if (!thread) thread = list?.[0] || null;
      if (!thread) {
        thread = await createMySupportThread();
      }

      setThreads(thread ? [thread] : []);

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

  useEffect(() => {
    const requested = requestedThreadIdFromQuery;
    if (!token) return;
    if (!requested) return;
    const current = selectedThreadIdRef.current;
    if (current && String(current) === String(requested)) return;

    (async () => {
      try {
        const data = await listMySupportThreads();
        const list = Array.isArray(data) ? data : [];
        const thread = list.find((t) => String(t?.id || "") === String(requested)) || null;
        if (!thread?.id) return;
        setThreads([thread]);
        setSelectedThreadId(thread.id);
        forceScrollOnceRef.current = true;
        await loadSelectedMessages(thread.id, { silent: true });
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedThreadIdFromQuery, token]);

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
      if (!url) return;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (disposed) return;
      };

      ws.onclose = () => {
        if (disposed) return;
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

        if (data.type === "SUPPORT_MESSAGE_CREATED") {
          try {
            window.dispatchEvent(new Event("CP_NOTIFICATIONS_PING"));
          } catch {
            // ignore
          }
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
        const alreadyHasReal = list.some((m) => String(m?.id) === String(saved?.id));
        if (alreadyHasReal) {
          return list.filter((m) => String(m?.id) !== String(tmpId));
        }
        return list.map((m) => (String(m?.id) === String(tmpId) ? { ...saved, clientStatus: "SENT" } : m));
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
        const alreadyHasReal = list.some((m) => String(m?.id) === String(saved?.id));
        if (alreadyHasReal) {
          return list.map((m) => {
            if (String(m?.id) === String(saved?.id)) return { ...m, attachmentLocalUrl: localUrl };
            return m;
          }).filter((m) => String(m?.id) !== String(tmpId));
        }
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
        subtitle="Contactez le support et envoyez vos suggestions"
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
        <div hidden={activeTab !== "support"}>
          <div className="cp-admin-support-grid cp-admin-support-grid--messaging" style={{ height: "calc(100vh - 300px)", minHeight: 520 }}>
            <div className="cp-admin-support-panel">
              <div className="cp-admin-support-panel-header">
                <div style={{ fontWeight: 800, marginBottom: 10 }}>Conversations</div>
              </div>
              <div className="cp-admin-support-panel-body">
                {selectedThread?.id ? (
                  (() => {
                    const preview = selectedThread?.lastMessagePreview || selectedThread?.firstMessagePreview || "Nouvelle conversation";
                    const dt = formatDateTime(selectedThread?.lastMessageAt || selectedThread?.createdAt);
                    const unread = Number(selectedThread?.unreadCount || 0);
                    const isActive = selectedThreadId && String(selectedThreadId) === String(selectedThread.id);
                    return (
                      <button
                        type="button"
                        onClick={async () => {
                          setSelectedThreadId(selectedThread.id);
                          setThreadMenuOpen(false);
                          setMessageSearchOpen(false);
                          setMessageQuery("");
                          forceScrollOnceRef.current = true;
                          await loadSelectedMessages(selectedThread.id, { silent: false });
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: 12,
                          border: "none",
                          borderBottom: "1px solid #e5e7eb",
                          background: isActive ? "#f1f5f9" : "#fff",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ fontWeight: 800, fontSize: 13, lineHeight: 1.1, color: "#111827" }}>Support</div>
                          {unread > 0 ? <span className="cp-unread-pill">{unread > 99 ? "99+" : unread}</span> : null}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {preview}
                        </div>
                        {dt ? <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{dt}</div> : null}
                      </button>
                    );
                  })()
                ) : (
                  <div style={{ padding: 12 }} className="text-sm text-gray-600">
                    Chargement…
                  </div>
                )}
              </div>
            </div>

            <div className="cp-admin-support-panel">
              <div className="cp-admin-support-panel-header">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: "#111827" }}>Support</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                      {selectedThread?.claimedByAdminName
                        ? `Agent : ${claimedByFirstName || selectedThread.claimedByAdminName}`
                        : "En attente d'un agent…"}
                    </div>
                  </div>

                  {selectedThreadId ? (
                    <div style={{ position: "relative" }} ref={threadMenuRef}>
                      <button
                        type="button"
                        className="cp-icon-btn cp-icon-btn--ghost"
                        aria-label="Options"
                        onClick={() => setThreadMenuOpen((v) => !v)}
                      >
                        <MoreVertical size={18} />
                      </button>

                      {threadMenuOpen ? (
                        <ul
                          className="dropdown-menu"
                          role="menu"
                          aria-label="Options support"
                          style={{
                            position: "absolute",
                            top: "calc(100% + 6px)",
                            right: 0,
                            left: "auto",
                            width: "auto",
                            minWidth: 180,
                            maxWidth: "calc(100vw - 24px)",
                            zIndex: 50,
                          }}
                        >
                          <li
                            role="menuitem"
                            onClick={() => {
                              openMessageSearch();
                            }}
                          >
                            Rechercher
                          </li>
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {messageSearchOpen ? (
                  <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ position: "relative", flex: 1 }}>
                      <Search
                        size={16}
                        style={{
                          position: "absolute",
                          left: 14,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#64748b",
                          pointerEvents: "none",
                        }}
                      />
                      <input
                        ref={messageSearchInputRef}
                        value={messageQuery}
                        onChange={(e) => setMessageQuery(e.target.value)}
                        placeholder="Rechercher"
                        className="w-full pr-10 py-2 rounded-xl border border-gray-300"
                        style={{ paddingLeft: 35 }}
                        disabled={!selectedThreadId}
                      />
                      {String(messageQuery || "").trim() ? (
                        <button
                          type="button"
                          onClick={() => setMessageQuery("")}
                          aria-label="Effacer"
                          style={{
                            position: "absolute",
                            right: 10,
                            top: "50%",
                            transform: "translateY(-50%)",
                            border: "none",
                            background: "transparent",
                            color: "#64748b",
                          }}
                          disabled={!selectedThreadId}
                        >
                          <X size={16} />
                        </button>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      className="btn-secondary-app"
                      onClick={closeMessageSearch}
                      aria-label="Fermer"
                      style={{ padding: "8px 10px" }}
                      disabled={!selectedThreadId}
                    >
                      <X size={16} />
                    </button>

                    {messageNeedle ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                              type="button"
                              className="btn-secondary-app"
                              onClick={() => jumpMatch(-1)}
                              disabled={matchMessageIds.length === 0}
                              aria-label="Résultat précédent"
                              style={{ padding: "8px 10px" }}
                            >
                              <ChevronUp size={16} />
                            </button>
                        <button
                          type="button"
                              className="btn-secondary-app"
                              onClick={() => jumpMatch(1)}
                              disabled={matchMessageIds.length === 0}
                              aria-label="Résultat suivant"
                              style={{ padding: "8px 10px" }}
                            >
                              <ChevronDown size={16} />
                            </button>
                        <div style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>
                          {matchMessageIds.length === 0 ? "0" : activeMatchIndex + 1}/{matchMessageIds.length}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="cp-support-panel-body" style={{ padding: 12 }}>
                {!selectedThreadId ? (
                  <div className="text-sm text-gray-600">Chargement…</div>
                ) : (
                  <>
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
                 {sortedMessages.length === 0 ? (
                   <div className="text-sm text-gray-600">Écrivez votre premier message.</div>
                 ) : (
                   sortedMessages.map((m, idx) => {
                    const isSystem = String(m?.kind || "").toUpperCase() === "SYSTEM";
                    const isAdmin = String(m.senderRole || "").toUpperCase() === "ADMIN";
                    const isMine = !isAdmin;
                    const isSending = String(m?.clientStatus || "").toUpperCase() === "SENDING";
                     const isRead = !!m.readByOther;
                     const checkColor = isRead ? "#3498db" : "#94a3b8";
                      const checkLabel = isSending ? "\u2713" : "\u2713\u2713";
                     const messageId = String(m?.id || "");
                     const isMatch = !!messageNeedle && String(m?.content || "").toLowerCase().includes(messageNeedle);
                     const isActiveMatch =
                       isMatch && matchMessageIds[activeMatchIndex] && matchMessageIds[activeMatchIndex] === messageId;
                     const attachmentUrl = m?.attachmentLocalUrl || attachmentUrlsByMessageId[String(m?.id)];
                      const dayKey = getDayKey(m?.createdAt);
                      const prevDayKey = getDayKey(sortedMessages?.[idx - 1]?.createdAt);
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
                                ref={(el) => {
                                  if (!messageId) return;
                                  if (el) messageRefs.current[messageId] = el;
                                }}
                                style={{
                                  fontSize: 12,
                                  color: "#475569",
                                  background: "#f1f5f9",
                                  border: "1px solid " + (isActiveMatch ? "#f59e0b" : isMatch ? "#fbbf24" : "#e2e8f0"),
                                 padding: "6px 10px",
                                 borderRadius: 999,
                                  maxWidth: "80%",
                                  textAlign: "center",
                                  wordBreak: "break-word",
                                }}
                              >
                               {messageNeedle ? renderHighlighted(String(m.content || "").trim(), messageNeedle) : String(m.content || "").trim()}
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
                              ref={(el) => {
                                if (!messageId) return;
                                if (el) messageRefs.current[messageId] = el;
                              }}
                              style={{
                               maxWidth: "66%",
                               padding: "10px 12px",
                               borderRadius: 14,
                                 background: isMine ? "#dcf8c6" : "#f3f4f6",
                                border: "1px solid " + (isActiveMatch ? "#f59e0b" : isMatch ? "#fbbf24" : isMine ? "#b7e4a8" : "#e5e7eb"),
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
                               {messageNeedle ? renderHighlighted(String(m.content || ""), messageNeedle) : m.content}
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
                  placeholder="Écrire un message..."
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

