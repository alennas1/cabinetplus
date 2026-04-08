import React, { useEffect, useMemo, useRef, useState } from "react";
import { Headphones, MessageSquare, Edit3, Send, Search, X, MoreVertical, Image as ImageIcon, Lock, CheckCircle, Shield, ChevronUp, ChevronDown } from "react-feather";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import SortableTh from "../components/SortableTh";
import MetadataInfo from "../components/MetadataInfo";
import { getApiErrorMessage } from "../utils/error";
import { formatDateTimeByPreference } from "../utils/dateFormat";
import { adminListFeedback } from "../services/feedbackService";
import { adminFinishThread, adminGetThreadMessages, adminListSupportThreads, adminSendThreadImage, adminSendThreadMessage, adminTakeoverThread, getSupportAttachmentBlob } from "../services/supportService";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
import "./Patients.css";
import "./Patient.css";
import "./Support.css";

const PRESENCE_TICK_MS = 30000;
const LONGTIME_AFTER_DAYS = 7;
const OFFLINE_GRACE_MS = 60000;

const AdminSupportCenter = () => {
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth || {});
  const myAdminId = user?.id != null ? String(user.id) : null;
  const isSuperAdmin = Boolean(user?.canDeleteAdmin);
  const [activeTab, setActiveTab] = useState("support"); // support | feedback
  const [loading, setLoading] = useState(true);

  // Support (threads + messages)
  const [threadQuery, setThreadQuery] = useState("");
  const [threads, setThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [presenceNow, setPresenceNow] = useState(() => Date.now());
  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [messageQuery, setMessageQuery] = useState("");
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);
  const [threadMenuOpen, setThreadMenuOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState(null); // { url, alt }
  const chatEndRef = useRef(null);
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
    const data = await adminListSupportThreads("");
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

  const handleFinishSelectedThread = async () => {
    if (!selectedThreadId) return;
    try {
      const updated = await adminFinishThread(selectedThreadId);
      if (updated?.id) setThreads((prev) => upsertThreadSummary(prev, updated));
      toast.success("Conversation terminÃ©e");
      setSelectedThreadId(null);
      setMessages([]);
      await loadThreads();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Impossible de terminer la conversation"));
    }
  };

  const handleTakeoverSelectedThread = async () => {
    if (!selectedThreadId) return;
    try {
      const updated = await adminTakeoverThread(selectedThreadId);
      if (updated?.id) setThreads((prev) => upsertThreadSummary(prev, updated));
      toast.success("Conversation reprise");
      forceScrollOnceRef.current = true;
      await loadThreadMessages(selectedThreadId);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Impossible de reprendre la conversation"));
    }
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
      const [item] = next.splice(idx, 1);
      next.unshift(item);
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

  useEffect(() => {
    initLoad();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setPresenceNow(Date.now()), PRESENCE_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const conversationNeedle = useMemo(() => String(threadQuery || "").trim().toLowerCase(), [threadQuery]);

  const filteredThreads = useMemo(() => {
    const list = Array.isArray(threads) ? threads : [];
    if (!conversationNeedle) return list;

    return list.filter((t) => {
      const title = String(t?.clinicName || t?.clinicOwnerName || (t?.id != null ? `Thread #${t.id}` : "")).toLowerCase();
      const phone = String(t?.phoneNumber || "").toLowerCase();
      const preview = String(t?.lastMessagePreview || "").toLowerCase();
      const senderName = String(t?.lastClinicSenderName || "").toLowerCase();
      const role = String(t?.clinicOwnerRole || t?.lastClinicSenderRole || "").toLowerCase();
      return (
        title.includes(conversationNeedle) ||
        phone.includes(conversationNeedle) ||
        preview.includes(conversationNeedle) ||
        senderName.includes(conversationNeedle) ||
        role.includes(conversationNeedle)
      );
    });
  }, [threads, conversationNeedle]);

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
          const patched =
            currentThreadId && String(summary.id) === String(currentThreadId) && data.type === "SUPPORT_MESSAGE_CREATED"
              ? { ...summary, unreadCount: 0 }
              : summary;
          setThreads((prev) => upsertThreadSummary(prev, patched));
        }

        if (msg?.threadId && currentThreadId && String(msg.threadId) === String(currentThreadId) && data.type !== "SUPPORT_THREAD_UPDATED") {
          setMessages((prev) => upsertMessage(prev, msg));
        }

        if (data.type === "SUPPORT_CLAIM_UPDATED" && summary?.id && currentThreadId && String(summary.id) === String(currentThreadId)) {
          const claimedBy = summary?.claimedByAdminId != null ? String(summary.claimedByAdminId) : null;
          const lockedByOther = claimedBy && myAdminId && claimedBy !== myAdminId && !isSuperAdmin;
          if (lockedByOther) {
            const byName = summary?.claimedByAdminName || "un autre admin";
            toast.info(`Conversation reprise par ${byName}`);
            setSelectedThreadId(null);
            setMessages([]);
          }
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

  const claimedByFooterLabel = useMemo(() => {
    const claimedById = selectedThread?.claimedByAdminId != null ? String(selectedThread.claimedByAdminId) : null;
    if (!claimedById) return null;
    if (myAdminId && claimedById === myAdminId) return null;
    const claimedByName = String(selectedThread?.claimedByAdminName || "").trim();
    return `Pris en charge par: ${claimedByName || "Admin"}`;
  }, [selectedThread, myAdminId]);

  const selectedPresence = useMemo(() => {
    if (!selectedThread) return { online: false, lastSeenAt: null };

    const hasSender = selectedThread?.lastClinicSenderId != null;
    const senderOnline = selectedThread?.lastClinicSenderOnline;
    const senderLastSeenAt = selectedThread?.lastClinicSenderLastSeenAt;

    if (hasSender && (senderOnline != null || senderLastSeenAt != null)) {
      return { online: senderOnline, lastSeenAt: senderLastSeenAt };
    }

    return { online: selectedThread?.clinicOwnerOnline, lastSeenAt: selectedThread?.clinicOwnerLastSeenAt };
  }, [selectedThread]);

  const selectedLockedByOther = useMemo(() => {
    const claimedById = selectedThread?.claimedByAdminId != null ? String(selectedThread.claimedByAdminId) : null;
    return Boolean(claimedById && myAdminId && claimedById !== myAdminId);
  }, [selectedThread, myAdminId]);

  const canSendSelected = Boolean(selectedThreadId && !selectedLockedByOther);
  const displayMessages = useMemo(() => (Array.isArray(messages) ? messages : []), [messages]);

  const messageNeedle = useMemo(() => {
    const q = String(messageQuery || "").trim().toLowerCase();
    return q || "";
  }, [messageQuery]);

  const matchMessageIds = useMemo(() => {
    if (!messageNeedle) return [];
    return displayMessages
      .filter((m) => String(m?.content || "").toLowerCase().includes(messageNeedle))
      .map((m) => String(m?.id || ""));
  }, [displayMessages, messageNeedle]);

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
    setThreadMenuOpen(false);
    setMessageSearchOpen(false);
    setMessageQuery("");
    setActiveMatchIndex(-1);
  }, [selectedThreadId]);

  useEffect(() => {
    if (!messageNeedle) {
      setActiveMatchIndex(-1);
      return;
    }
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
  }, [messageSearchOpen]);

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

  const formatLastSeen = (lastSeenAt) => {
    if (!lastSeenAt) return null;
    const t = new Date(lastSeenAt).getTime();
    if (!Number.isFinite(t)) return null;
    const diffMs = Math.max(0, presenceNow - t);
    const longtimeAfterMs = LONGTIME_AFTER_DAYS * 24 * 60 * 60 * 1000;
    if (diffMs > longtimeAfterMs) return "longtemps";
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${Math.max(1, diffMin)} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `${Math.max(1, diffDays)} j`;
  };

  const getPresenceText = ({ online, lastSeenAt }) => {
    if (online) return "En ligne";
    const label = formatLastSeen(lastSeenAt);
    if (!label) return "Hors ligne · longtemps";
    if (label === "longtemps") return "Hors ligne · longtemps";
    return `Hors ligne · il y a ${label}`;
  };

  const isWithinOfflineGrace = (lastSeenAt) => {
    if (!lastSeenAt) return false;
    const t = new Date(lastSeenAt).getTime();
    if (!Number.isFinite(t)) return false;
    return presenceNow - t < OFFLINE_GRACE_MS;
  };

  const computeEffectiveOnline = ({ online, lastSeenAt }) => Boolean(online) || isWithinOfflineGrace(lastSeenAt);

  const roleBadgeLabel = (role) => {
    const r = String(role || "").toUpperCase();
    if (!r) return "";
    if (r === "DENTIST") return "Dentiste";
    if (r === "EMPLOYEE") return "Employé";
    if (r === "LAB") return "Laboratoire";
    if (r === "ADMIN") return "Admin";
    return r;
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
    if (!canSendSelected) {
      toast.info("Conversation verrouillee");
      return;
    }
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
    if (!canSendSelected || sendingChat) return;
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
    if (!canSendSelected) {
      toast.info("Conversation verrouillee");
      return;
    }

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

      <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div className="tab-buttons" style={{ marginBottom: 0 }}>
          <button className={activeTab === "support" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("support")}>
            <MessageSquare size={16} /> Support
          </button>
          <button className={activeTab === "feedback" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("feedback")}>
            <Edit3 size={16} /> Feedback
          </button>
        </div>
      </div>

      {activeTab === "support" && (
        <div className="cp-admin-support-grid">
          {/* Threads list */}
            <div className="cp-admin-support-panel">
             <div className="cp-admin-support-panel-header" style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                    value={threadQuery}
                    onChange={(e) => setThreadQuery(e.target.value)}
                    placeholder="Rechercher (nom, clinique, téléphone)…"
                    className="w-full pr-10 py-2 rounded-xl border border-gray-300"
                    style={{ paddingLeft: 35 }}
                  />
                  {String(threadQuery || "").trim() ? (
                    <button
                      type="button"
                      onClick={() => setThreadQuery("")}
                      aria-label="Effacer"
                      style={{
                        position: "absolute",
                        right: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        border: "none",
                        background: "transparent",
                        color: "#64748b",
                        padding: 0,
                        cursor: "pointer",
                      }}
                    >
                      <X size={16} />
                    </button>
                  ) : null}
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>{filteredThreads.length} résultat(s)</div>
            </div>

            <div className="cp-admin-support-panel-body">
              {(threads || []).length === 0 ? (
                <div className="p-3 text-sm text-gray-600">Aucune conversation.</div>
              ) : (filteredThreads || []).length === 0 ? (
                <div style={{ padding: 12 }} className="text-sm text-gray-600">
                  Aucun résultat.
                </div>
              ) : (
                filteredThreads.map((t) => {
                  const active = String(t.id) === String(selectedThreadId);
                  const title = t.clinicName || t.clinicOwnerName || `Thread #${t.id}`;
                  const preview = t.lastMessagePreview || "";
                  const senderPrefix = roleBadgeLabel(t?.lastMessageSenderRole) || "Utilisateur";
                  const previewText = preview ? `${senderPrefix}: ${preview}` : "Nouvelle conversation";
                  const dt = formatDateTime(t.lastMessageAt);
                  const claimedById = t?.claimedByAdminId != null ? String(t.claimedByAdminId) : null;
                  const claimedByName = t?.claimedByAdminName || "";
                  const lockedByOther = claimedById && myAdminId && claimedById !== myAdminId;
                  const lockedByMe = claimedById && myAdminId && claimedById === myAdminId;
                  const canOpen = !lockedByOther || isSuperAdmin;
                  const actorRole = String(t?.clinicOwnerRole || t?.lastClinicSenderRole || "").toUpperCase();
                  const roleLabel = roleBadgeLabel(actorRole) || (actorRole || "Utilisateur");
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={async () => {
                        if (!canOpen) {
                          toast.info(`Conversation verrouillée par ${claimedByName || "un autre admin"}`);
                          return;
                        }
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
                        background: active ? "#e0f2fe" : !canOpen ? "#f8fafc" : "#fff",
                        cursor: !canOpen ? "not-allowed" : "pointer",
                        opacity: !canOpen ? 0.75 : 1,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 800, fontSize: 13, color: "#111827", display: "flex", gap: 8, alignItems: "center" }}>
                          {title}
                          {roleLabel ? <span className="context-badge">{roleLabel}</span> : null}
                          {lockedByMe ? <span title="Pris en charge par vous"><CheckCircle size={14} color="#16a34a" /></span> : null}
                          {lockedByOther ? <span title={`Pris en charge par ${claimedByName || "un autre admin"}`}><Lock size={14} color="#ef4444" /></span> : null}
                          {isSuperAdmin && lockedByOther ? <span title="Super admin"><Shield size={14} color="#0ea5e9" /></span> : null}
                        </div>
                        {Number(t?.unreadCount || 0) > 0 ? (
                          <span className="cp-unread-pill">{Number(t.unreadCount) > 99 ? "99+" : Number(t.unreadCount)}</span>
                        ) : null}
                      </div>
                      {claimedById ? (
                        <div style={{ fontSize: 11, color: lockedByOther ? "#ef4444" : "#16a34a", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                          {lockedByOther ? <Lock size={12} /> : <CheckCircle size={12} />}
                          <span>Pris en charge</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Disponible</div>
                      )}
                      <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontSize: 12, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                          {previewText}
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8", flex: "0 0 auto" }}>{dt}</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Conversation */}
          <div className="cp-admin-support-panel">
            <div className="cp-admin-support-panel-header" style={{ position: "relative" }}>
              <div style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedThread ? (selectedThread.clinicName || selectedThread.clinicOwnerName || `Thread #${selectedThread.id}`) : "Sélectionnez une conversation"}
                </div>
                {selectedThread ? (() => {
                  const actorRole = String(selectedThread?.clinicOwnerRole || selectedThread?.lastClinicSenderRole || "").toUpperCase();
                  const roleLabel =
                    actorRole === "EMPLOYEE" ? "Employé" :
                    actorRole === "DENTIST" ? "Dentiste" :
                    actorRole === "LAB" ? "Laboratoire" :
                    actorRole || "Utilisateur";
                  return roleLabel ? <span className="context-badge">{roleLabel}</span> : null;
                })() : null}
              </div>
              <div
                style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 8, alignItems: "center" }}
                ref={threadMenuRef}
              >
                {selectedThread ? (() => {
                  const claimedById = selectedThread?.claimedByAdminId != null ? String(selectedThread.claimedByAdminId) : null;
                  const lockedByMe = claimedById && myAdminId && claimedById === myAdminId;
                  return lockedByMe ? (
                    <button
                      type="button"
                      className="btn-secondary-app"
                      onClick={() => {
                        setThreadMenuOpen(false);
                        handleFinishSelectedThread();
                      }}
                    >
                      Finish
                    </button>
                  ) : null;
                })() : null}

                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    className="cp-icon-btn cp-icon-btn--ghost"
                    aria-label="Options"
                    onClick={() => setThreadMenuOpen((v) => !v)}
                    disabled={!selectedThreadId}
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
                          setThreadMenuOpen(false);
                          openMessageSearch();
                        }}
                        style={!selectedThreadId ? { opacity: 0.5, pointerEvents: "none" } : undefined}
                      >
                        Rechercher
                      </li>
                    </ul>
                  ) : null}
                </div>
              </div>
              {selectedThread ? (() => {
                const claimedById = selectedThread?.claimedByAdminId != null ? String(selectedThread.claimedByAdminId) : null;
                const claimedByName = selectedThread?.claimedByAdminName || "";
                const lockedByOther = claimedById && myAdminId && claimedById !== myAdminId;
                const lockedByMe = claimedById && myAdminId && claimedById === myAdminId;
                const statusColor = lockedByOther ? "#ef4444" : lockedByMe ? "#16a34a" : "#64748b";
                const statusText = claimedById ? "Pris en charge" : "Non assignée";

                return (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 12, color: statusColor, display: "flex", alignItems: "center", gap: 6 }}>
                      {lockedByOther ? <Lock size={14} /> : lockedByMe ? <CheckCircle size={14} /> : null}
                      <span>{statusText}</span>
                      <span style={{ color: "#94a3b8" }}>{wsConnected ? "• WS" : "• WS off"}</span>
                      {(() => {
                        const effectiveOnline = computeEffectiveOnline({
                          online: selectedPresence?.online,
                          lastSeenAt: selectedPresence?.lastSeenAt,
                        });
                        const text = getPresenceText({ online: effectiveOnline, lastSeenAt: selectedPresence?.lastSeenAt });
                        return (
                          <span
                            style={{
                              marginLeft: 6,
                              color: effectiveOnline ? "#16a34a" : "#64748b",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span
                              aria-hidden="true"
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: effectiveOnline ? "#22c55e" : "#94a3b8",
                                flex: "0 0 auto",
                              }}
                            />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{text}</span>
                          </span>
                        );
                      })()}
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {lockedByOther && isSuperAdmin ? (
                        <button type="button" className="btn-primary2" onClick={handleTakeoverSelectedThread}>
                          Take over
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })() : null}
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
                    placeholder="Rechercherâ€¦"
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
                      aria-label="RÃ©sultat prÃ©cÃ©dent"
                      style={{ padding: "8px 10px" }}
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      className="btn-secondary-app"
                      onClick={() => jumpMatch(1)}
                      disabled={matchMessageIds.length === 0}
                      aria-label="RÃ©sultat suivant"
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
              ) : displayMessages.length === 0 ? (
                <div className="text-sm text-gray-600">{(messages || []).length === 0 ? "Aucun message." : messageQuery ? "Aucun rÃ©sultat." : "Aucun message."}</div>
              ) : (
                displayMessages.map((m, idx) => {
                  const isSystem = String(m?.kind || "").toUpperCase() === "SYSTEM";
                  const isAdmin = String(m.senderRole || "").toUpperCase() === "ADMIN";
                  const isMine = isAdmin;
                  const isSending = String(m?.clientStatus || "").toUpperCase() === "SENDING";
                  const isRead = !!m.readByOther;
                  const checkColor = isRead ? "#3498db" : "#94a3b8"; // app blue / grey
                  const checkLabel = isSending ? "✓" : "✓✓"; // sent (single) / received+read (double)
                  const attachmentUrl = m?.attachmentLocalUrl || attachmentUrlsByMessageId[String(m?.id)];
                  const dayKey = getDayKey(m?.createdAt);
                  const prevDayKey = getDayKey(displayMessages?.[idx - 1]?.createdAt);
                  const showDay = !!dayKey && dayKey !== prevDayKey;
                  const timeLabel = formatTime(m?.createdAt);
                  const messageId = String(m?.id || "");
                  const isMatch = !!messageNeedle && String(m?.content || "").toLowerCase().includes(messageNeedle);
                  const isActiveMatch = isMatch && matchMessageIds[activeMatchIndex] && matchMessageIds[activeMatchIndex] === messageId;

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
                              maxWidth: "92%",
                              textAlign: "center",
                              wordBreak: "break-word",
                            }}
                          >
                            {messageNeedle ? renderHighlighted(String(m.content || ""), messageNeedle) : String(m.content || "").trim()}
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
                          justifyContent: isAdmin ? "flex-end" : "flex-start",
                          marginBottom: 10,
                        }}
                      >
                        <div
                          ref={(el) => {
                            if (!messageId) return;
                            if (el) messageRefs.current[messageId] = el;
                          }}
                          style={{
                            maxWidth: "78%",
                            padding: "10px 12px",
                            borderRadius: 14,
                            background: isMine ? "#dcf8c6" : "#ffffff",
                            border:
                              "1px solid " +
                              (isActiveMatch ? "#f59e0b" : isMine ? "#b7e4a8" : isMatch ? "#fbbf24" : "#e5e7eb"),
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
                            {messageNeedle ? renderHighlighted(m.content, messageNeedle) : m.content}
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

            {claimedByFooterLabel ? (
              <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>{claimedByFooterLabel}</div>
            ) : null}

            <form onSubmit={handleSendAdminMessage} className="cp-admin-support-chat-footer flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImageSelected}
              />
              <button type="button" className="btn-secondary-app cp-icon-btn" onClick={handlePickImage} disabled={!canSendSelected || sendingChat}>
                <ImageIcon size={18} />
              </button>
              <input
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Répondre…"
                className="w-full px-4 py-3 rounded-xl border border-gray-300"
                maxLength={2000}
                disabled={!canSendSelected}
              />
              <button
                type="submit"
                className="btn-primary2 cp-icon-btn"
                aria-label="Envoyer"
                disabled={!canSendSelected || sendingChat || !String(chatText || "").trim()}
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
