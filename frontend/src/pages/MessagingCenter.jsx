import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, MoreVertical, Search, Send, X } from "react-feather";
import { toast } from "react-toastify";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import ModernDropdown from "../components/ModernDropdown";
import { getApiErrorMessage } from "../utils/error";
import { formatDateTimeByPreference } from "../utils/dateFormat";
import { ensureMessagingPushSubscription, isWebPushSupported } from "../pwa/pushMessaging";
import {
  ensureMessagingThreadWith,
  getMessagingThreadMessages,
  listAdminGroupMessages,
  listMessagingContacts,
  listMessagingThreads,
  markMessagingThreadRead,
  heartbeatMessagingPresence,
  sendAdminGroupMessage,
  sendMessagingThreadMessage,
} from "../services/messagingService";
import "./Patients.css";
import "./Patient.css";
import "./Support.css";

const POLL_SELECTED_MS = 5000;
const POLL_IDLE_MS = 12000;
const PRESENCE_TICK_MS = 30000;
const LONGTIME_AFTER_DAYS = 7;
const OFFLINE_GRACE_MS = 60000;
const ADMIN_GROUP_PUBLIC_ID = "__ADMIN_GROUP__";
const ADMIN_GROUP_THREAD_ID = "__ADMIN_GROUP_THREAD__";

const MessagingCenter = ({
  title = "Messagerie",
  subtitle = "Discutez avec votre équipe et vos partenaires",
  forcedContactType = null, // e.g. "ADMIN" for internal admin messaging
  hideContactTypeSelector = false,
  enableAdminGroup = false,
}) => {
  const { user, token } = useSelector((state) => state.auth || {});
  const navigate = useNavigate();
  const location = useLocation();
  const myPublicId = user?.publicId ? String(user.publicId) : null;
  const viewerRole = String(user?.role || "").toUpperCase();
  const isAdminViewer = viewerRole === "ADMIN";
  const adminGroupEnabled = Boolean(enableAdminGroup && isAdminViewer);

  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [threads, setThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [selectedOtherPublicId, setSelectedOtherPublicId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [adminGroupLastMessage, setAdminGroupLastMessage] = useState(null);
  const [chatText, setChatText] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [conversationQuery, setConversationQuery] = useState("");
  const [contactType, setContactType] = useState(forcedContactType ? String(forcedContactType).toUpperCase() : "ALL"); // ALL | EMPLOYEE | LAB | DENTIST | ADMIN
  const [messageQuery, setMessageQuery] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [threadMenuOpen, setThreadMenuOpen] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [presenceNow, setPresenceNow] = useState(() => Date.now());

  const pollRef = useRef(null);
  const wsRef = useRef(null);
  const wsReconnectRef = useRef(null);
  const chatEndRef = useRef(null);
  const messageRefs = useRef({});
  const threadMenuRef = useRef(null);
  const messageSearchInputRef = useRef(null);
  const selectedThreadIdRef = useRef(null);
  const myPublicIdRef = useRef(null);
  const pushToastIdRef = useRef(null);

  const isAdminGroupSelected = String(selectedThreadId || "") === ADMIN_GROUP_THREAD_ID;

  const formatDateTime = (value) => {
    if (!value) return "";
    const label = formatDateTimeByPreference(value);
    return label === "-" ? "" : label;
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

  useEffect(() => {
    if (!forcedContactType) return;
    setContactType(String(forcedContactType).toUpperCase());
  }, [forcedContactType]);

  useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
    myPublicIdRef.current = myPublicId;
  }, [selectedThreadId, myPublicId]);

  useEffect(() => {
    const id = setInterval(() => setPresenceNow(Date.now()), PRESENCE_TICK_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!token) return;
    const tick = async () => {
      try {
        await heartbeatMessagingPresence();
      } catch {
        // ignore
      }
    };
    tick();
    const id = setInterval(tick, PRESENCE_TICK_MS);
    return () => clearInterval(id);
  }, [token]);

  useEffect(() => {
    if (!isWebPushSupported()) return;

    let cancelled = false;

    (async () => {
      // If already granted, ensure we have a subscription saved server-side (silent).
      if (Notification.permission === "granted") {
        await ensureMessagingPushSubscription({ prompt: false }).catch(() => {});
        return;
      }

      // Only show CTA if permission is still "default" AND server is configured with a VAPID public key.
      if (Notification.permission !== "default") return;
      const probe = await ensureMessagingPushSubscription({ prompt: false }).catch(() => ({ ok: false }));
      if (cancelled) return;
      if (probe?.reason === "missing_public_key") return;
      if (pushToastIdRef.current != null && toast.isActive(pushToastIdRef.current)) return;

      pushToastIdRef.current = toast.info(
        (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="font-semibold">Activer les notifications</div>
              <div className="text-sm opacity-90">Recevez un rappel quand un nouveau message arrive.</div>
            </div>
            <button
              type="button"
              className="px-3 py-2 rounded bg-slate-900 text-white text-sm hover:bg-slate-800"
              onClick={async () => {
                if (pushToastIdRef.current != null) toast.dismiss(pushToastIdRef.current);
                pushToastIdRef.current = null;
                const res = await ensureMessagingPushSubscription({ prompt: true }).catch(() => ({ ok: false }));
                if (res?.ok) toast.success("Notifications activees");
              }}
            >
              Activer
            </button>
          </div>
        ),
        { autoClose: false, closeOnClick: false, closeButton: false, draggable: false }
      );
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const threadsByOtherId = useMemo(() => {
    const map = {};
    (threads || []).forEach((t) => {
      if (t?.otherUserPublicId) map[String(t.otherUserPublicId)] = t;
    });
    return map;
  }, [threads]);

  const selectedThread = useMemo(() => {
    return (threads || []).find((t) => String(t?.id) === String(selectedThreadId)) || null;
  }, [threads, selectedThreadId]);

  const otherDetailsPath = useMemo(() => {
    if (isAdminGroupSelected) return null;
    const viewerRole = String(user?.role || "").toUpperCase();
    const otherPublicId = selectedThread?.otherUserPublicId ? String(selectedThread.otherUserPublicId) : "";
    const contact = otherPublicId
      ? (contacts || []).find((c) => String(c?.userPublicId || "") === otherPublicId) || null
      : null;

    const role = String(selectedThread?.otherRole || contact?.role || "").toUpperCase();
    const otherOwnerDentistId = selectedThread?.otherOwnerDentistId ?? contact?.ownerDentistId ?? null;
    const otherDetailsPublicId = contact?.detailsPublicId ? String(contact.detailsPublicId) : "";

    if (viewerRole === "DENTIST") {
      if (role === "EMPLOYEE" && otherDetailsPublicId) return `/gestion-cabinet/employees/${otherDetailsPublicId}`;
      if (role === "LAB" && otherDetailsPublicId) return `/gestion-cabinet/laboratories/${otherDetailsPublicId}`;
      return null;
    }

    if (viewerRole === "EMPLOYEE") {
      if (role === "DENTIST") return null;
      if (role === "LAB" && otherDetailsPublicId) return `/gestion-cabinet/laboratories/${otherDetailsPublicId}`;
      return null;
    }

    if (viewerRole === "LAB") {
      // Lab portal routes use dentist publicId (UUID), not numeric userId.
      if (role === "DENTIST" && otherPublicId) return `/lab/dentists/${otherPublicId}`;
      if (role === "EMPLOYEE" && otherOwnerDentistId) {
        const owner = (contacts || []).find(
          (c) => String(c?.role || "").toUpperCase() === "DENTIST" && String(c?.userId || "") === String(otherOwnerDentistId)
        );
        const ownerPublicId = owner?.userPublicId ? String(owner.userPublicId) : "";
        if (ownerPublicId) return `/lab/dentists/${ownerPublicId}`;
      }
      return null;
    }

    return null;
  }, [contacts, isAdminGroupSelected, selectedThread, user?.role]);

  const conversationNeedle = useMemo(() => String(conversationQuery || "").trim().toLowerCase(), [conversationQuery]);
  const messageNeedle = useMemo(() => String(messageQuery || "").trim().toLowerCase(), [messageQuery]);

  const effectiveContactType = useMemo(() => {
    if (forcedContactType) return String(forcedContactType).toUpperCase();
    return String(contactType || "ALL").toUpperCase();
  }, [contactType, forcedContactType]);

  const contactTypeOptions = useMemo(() => {
    const base = [
      { value: "ALL", label: "Tous" },
      { value: "EMPLOYEE", label: "Employés" },
      { value: "LAB", label: "Laboratoires" },
      { value: "DENTIST", label: "Dentistes" },
    ];
    const forced = forcedContactType ? String(forcedContactType).toUpperCase() : null;
    const includeAdmin = viewerRole === "ADMIN" || forced === "ADMIN";
    if (includeAdmin) {
      base.push({ value: "ADMIN", label: "Admins" });
    }
    if (viewerRole === "LAB") return base.filter((o) => o.value !== "LAB");
    return base;
  }, [forcedContactType, viewerRole]);

  useEffect(() => {
    if (forcedContactType) return;
    const role = String(user?.role || "").toUpperCase();
    if (role === "LAB" && String(contactType || "").toUpperCase() === "LAB") {
      setContactType("ALL");
    }
  }, [contactType, forcedContactType, user?.role]);

  const filteredContacts = useMemo(() => {
    const list = Array.isArray(contacts) ? contacts : [];
    const type = effectiveContactType;

    return list.filter((c) => {
      if (!c?.userPublicId) return false;
      const role = String(c?.role || "").toUpperCase();
      const badge = String(c?.badge || "").toLowerCase();

      if (type !== "ALL") {
        if (type === "EMPLOYEE" && role !== "EMPLOYEE") return false;
        if (type === "LAB" && role !== "LAB") return false;
        if (type === "DENTIST" && role !== "DENTIST") return false;
        if (type === "ADMIN" && role !== "ADMIN") return false;
      }

      if (!conversationNeedle) return true;
      const name = String(c?.name || "").toLowerCase();
      const meta = String(c?.meta || "").toLowerCase();
      const thread = threadsByOtherId[String(c.userPublicId)] || null;
      const preview = String(thread?.lastMessagePreview || "").toLowerCase();
      const roleText = role.toLowerCase();

      return (
        name.includes(conversationNeedle) ||
        meta.includes(conversationNeedle) ||
        preview.includes(conversationNeedle) ||
        badge.includes(conversationNeedle) ||
        roleText.includes(conversationNeedle)
      );
    });
  }, [contacts, conversationNeedle, effectiveContactType, threadsByOtherId]);

  const matchMessageIds = useMemo(() => {
    if (!messageNeedle) return [];
    return (Array.isArray(messages) ? messages : [])
      .filter((m) => String(m?.content || "").toLowerCase().includes(messageNeedle))
      .map((m) => String(m?.id || ""));
  }, [messages, messageNeedle]);

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

  const loadContactsAndThreads = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const [c, t] = await Promise.all([listMessagingContacts(), listMessagingThreads()]);
      let contactsList = Array.isArray(c) ? c : [];
      let threadsList = Array.isArray(t) ? t : [];

      const forced = forcedContactType ? String(forcedContactType).toUpperCase() : null;

      // Messaging is business-to-business; support conversations live in the Support center.
      // Hide ADMIN users for non-admin viewers (unless explicitly forced).
      if (!isAdminViewer) {
        if (forced === "ADMIN") {
          contactsList = contactsList.filter((x) => String(x?.role || "").toUpperCase() === "ADMIN");
          threadsList = threadsList.filter((x) => String(x?.otherRole || "").toUpperCase() === "ADMIN");
        } else {
          contactsList = contactsList.filter((x) => String(x?.role || "").toUpperCase() !== "ADMIN");
          threadsList = threadsList.filter((x) => String(x?.otherRole || "").toUpperCase() !== "ADMIN");
        }
      }

      if (adminGroupEnabled) {
        const groupContact = {
          userPublicId: ADMIN_GROUP_PUBLIC_ID,
          userId: null,
          name: "Tous les admins",
          role: "ADMIN",
          badge: "Groupe",
          meta: null,
          ownerDentistId: null,
          online: true,
          lastSeenAt: null,
          detailsPublicId: null,
          isAdminGroup: true,
        };
        contactsList = [
          groupContact,
          ...(contactsList || []).filter((x) => String(x?.userPublicId || "") !== ADMIN_GROUP_PUBLIC_ID),
        ];
      }

      setContacts(contactsList);
      setThreads(threadsList);
      return { contacts: contactsList, threads: threadsList };
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Impossible de charger la messagerie"));
      return { contacts: [], threads: [] };
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadSelectedMessages = async (threadId, { silent = false } = {}) => {
    const id = threadId ?? selectedThreadId;
    if (!id) return;
    try {
      if (String(id) === ADMIN_GROUP_THREAD_ID) {
        const data = await listAdminGroupMessages();
        const list = Array.isArray(data) ? data : [];
        setMessages(list);
        setAdminGroupLastMessage(list.length > 0 ? list[list.length - 1] : null);
        return;
      }

      const data = await getMessagingThreadMessages(id);
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      if (!silent) toast.error(getApiErrorMessage(err, "Impossible de charger la conversation"));
    }
  };

  const openThreadWith = async (otherPublicId) => {
    if (!otherPublicId) return;
    if (adminGroupEnabled && String(otherPublicId) === ADMIN_GROUP_PUBLIC_ID) {
      setSelectedThreadId(ADMIN_GROUP_THREAD_ID);
      setSelectedOtherPublicId(ADMIN_GROUP_PUBLIC_ID);
      await loadSelectedMessages(ADMIN_GROUP_THREAD_ID, { silent: true });
      return;
    }
    const created = await ensureMessagingThreadWith(otherPublicId);
    setThreads((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const without = list.filter((t) => String(t?.id) !== String(created?.id));
      return [created, ...without];
    });
    setSelectedThreadId(created?.id || null);
    setSelectedOtherPublicId(otherPublicId);
    await loadSelectedMessages(created?.id, { silent: true });
  };

  const handleSelectContact = async (contact) => {
    if (adminGroupEnabled && (contact?.isAdminGroup || String(contact?.userPublicId || "") === ADMIN_GROUP_PUBLIC_ID)) {
      try {
        await openThreadWith(ADMIN_GROUP_PUBLIC_ID);
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Impossible d'ouvrir la conversation"));
      }
      return;
    }
    const otherId = contact?.userPublicId;
    if (!otherId) return;
    const thread = threadsByOtherId[String(otherId)] || null;
    if (thread?.id) {
      setSelectedThreadId(thread.id);
      setSelectedOtherPublicId(thread.otherUserPublicId || otherId);
      await loadSelectedMessages(thread.id, { silent: false });
      return;
    }
    try {
      await openThreadWith(otherId);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Impossible d'ouvrir la conversation"));
    }
  };

  useEffect(() => {
    (async () => {
      const { contacts: c, threads: t } = await loadContactsAndThreads({ silent: false });

      const params = new URLSearchParams(location.search || "");
      const requestedWith = String(params.get("with") || "").trim();
      const requestedRole = String(params.get("role") || "").trim().toUpperCase();
      const requestedDetails = String(params.get("details") || "").trim();
      const stateWith = String(location?.state?.with || location?.state?.withPublicId || "").trim();

      let initialOtherPublicId = requestedWith || stateWith;
      if (!initialOtherPublicId && requestedRole && requestedDetails) {
        const match = (c || []).find((contact) => {
          const role = String(contact?.role || "").trim().toUpperCase();
          const details = contact?.detailsPublicId != null ? String(contact.detailsPublicId) : "";
          return role === requestedRole && details === requestedDetails;
        });
        if (match?.userPublicId) initialOtherPublicId = String(match.userPublicId);
      }
      if (!initialOtherPublicId && requestedDetails) {
        const match = (c || []).find((contact) => {
          const details = contact?.detailsPublicId != null ? String(contact.detailsPublicId) : "";
          return details === requestedDetails;
        });
        if (match?.userPublicId) initialOtherPublicId = String(match.userPublicId);
      }

      if (initialOtherPublicId) {
        try {
          await openThreadWith(initialOtherPublicId);
          return;
        } catch (err) {
          toast.error(getApiErrorMessage(err, "Impossible d'ouvrir la conversation"));
        }
      }

      const firstThread = (t || [])[0] || null;
      if (firstThread?.id) {
        setSelectedThreadId(firstThread.id);
        setSelectedOtherPublicId(firstThread.otherUserPublicId || null);
        await loadSelectedMessages(firstThread.id, { silent: true });
        return;
      }
      const firstContact = (c || [])[0] || null;
      if (firstContact?.userPublicId) {
        try {
          await openThreadWith(firstContact.userPublicId);
        } catch {
          // ignore
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!adminGroupEnabled) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await listAdminGroupMessages();
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setAdminGroupLastMessage(list.length > 0 ? list[list.length - 1] : null);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminGroupEnabled]);

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

      ws.onmessage = async (event) => {
        if (disposed) return;
        let data = null;
        try {
          data = JSON.parse(event?.data || "null");
        } catch {
          return;
        }
        if (!data || !data.type) return;

        if (data.type === "PRESENCE_UPDATED") {
          const presence = data.presence || null;
          const publicId = presence?.userPublicId ? String(presence.userPublicId) : "";
          if (!publicId) return;
          const online = Boolean(presence?.online);
          const incomingLastSeenAt = presence?.lastSeenAt || null;

          setContacts((prev) => {
            const list = Array.isArray(prev) ? prev : [];
            return list.map((c) => {
              if (String(c?.userPublicId || "") !== publicId) return c;
              const lastSeenAt = incomingLastSeenAt ?? c?.lastSeenAt ?? null;
              return { ...c, online, lastSeenAt };
            });
          });

          setThreads((prev) => {
            const list = Array.isArray(prev) ? prev : [];
            return list.map((t) => {
              if (String(t?.otherUserPublicId || "") !== publicId) return t;
              const otherLastSeenAt = incomingLastSeenAt ?? t?.otherLastSeenAt ?? null;
              return { ...t, otherOnline: online, otherLastSeenAt };
            });
          });
          return;
        }

        if (data.type === "ADMIN_GROUP_MESSAGE_CREATED") {
          const msg = data.message || null;
          if (!msg?.id) return;
          setAdminGroupLastMessage(msg);

          const currentThreadId = selectedThreadIdRef.current;
          if (String(currentThreadId || "") === ADMIN_GROUP_THREAD_ID) {
            setMessages((prev) => upsertMessage(prev, msg));
          }
          return;
        }

        if (data.type !== "MESSAGE_CREATED") return;

        const summary = data.thread || null;
        const msg = data.message || null;

        if (summary?.id) setThreads((prev) => upsertThreadSummary(prev, summary));

        const currentThreadId = selectedThreadIdRef.current;
        const currentMyPublicId = myPublicIdRef.current;

        if (msg?.threadId && String(msg.threadId) === String(currentThreadId)) {
          setMessages((prev) => upsertMessage(prev, msg));

          const fromOther =
            msg?.senderPublicId &&
            currentMyPublicId &&
            String(msg.senderPublicId) !== String(currentMyPublicId);
          if (fromOther) {
            try {
              const updated = await markMessagingThreadRead(currentThreadId);
              if (updated?.id) setThreads((prev) => upsertThreadSummary(prev, updated));
            } catch {
              // ignore
            }
          }
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      cleanupSocket();
      setWsConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (wsConnected) return;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      await loadContactsAndThreads({ silent: true });
      if (selectedThreadId) {
        await loadSelectedMessages(selectedThreadId, { silent: true });
      }
    }, selectedThreadId ? POLL_SELECTED_MS : POLL_IDLE_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [selectedThreadId, wsConnected]);

  useEffect(() => {
    if (!token) return;
    if (!wsConnected) return;
    const id = setInterval(async () => {
      await loadContactsAndThreads({ silent: true });
    }, 15000);
    return () => clearInterval(id);
  }, [token, wsConnected]);

  useEffect(() => {
    if (!selectedThreadId) return;
    const el = chatEndRef.current;
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: "smooth" });
    } catch {
      // ignore
    }
  }, [messages.length, selectedThreadId]);

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

  const openMessageSearch = () => {
    if (!selectedThreadId) {
      toast.info("Choisissez une conversation");
      return;
    }
    setMessageSearchOpen(true);
  };

  const closeMessageSearch = () => {
    setMessageSearchOpen(false);
    setMessageQuery("");
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

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (sendingChat) return;
    const content = String(chatText || "").trim();
    if (!content) return;
    if (!selectedThreadId) return;
    const isAdminGroup = String(selectedThreadId || "") === ADMIN_GROUP_THREAD_ID;

    const tmpId = `tmp-${Date.now()}`;
    const nowIso = new Date().toISOString();

    try {
      setSendingChat(true);
      setMessages((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        {
          id: tmpId,
          threadId: isAdminGroup ? null : selectedThreadId,
          senderPublicId: null,
          senderRole: "ME",
          senderName: "Moi",
          senderBadge: "",
          content,
          createdAt: nowIso,
          readByOther: false,
          clientStatus: "SENDING",
        },
      ]);
      setChatText("");

      const saved = isAdminGroup ? await sendAdminGroupMessage(content) : await sendMessagingThreadMessage(selectedThreadId, content);
      setMessages((prev) =>
        (Array.isArray(prev) ? prev : []).map((m) => (String(m?.id) === String(tmpId) ? { ...saved, clientStatus: "SENT" } : m))
      );
      if (isAdminGroup) {
        setAdminGroupLastMessage(saved);
      } else {
        await loadContactsAndThreads({ silent: true });
      }
    } catch (err) {
      setMessages((prev) => (Array.isArray(prev) ? prev : []).filter((m) => String(m?.id) !== String(tmpId)));
      setChatText(content);
      toast.error(getApiErrorMessage(err, "Erreur lors de l'envoi du message"));
    } finally {
      setSendingChat(false);
    }
  };

  const contactLabel = (c) => {
    if (c?.isAdminGroup) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, lineHeight: 1.1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, lineHeight: 1.1 }}>
            <div style={{ fontWeight: 800, fontSize: 13, lineHeight: 1.1, color: "#111827" }}>{c?.name || "-"}</div>
            {c?.badge ? <span className="context-badge">{c.badge}</span> : null}
          </div>
          <div style={{ fontSize: 11, lineHeight: 1.1, color: "#64748b" }}>Groupe de discussion admins</div>
        </div>
      );
    }
    const badge = c?.badge || "";
    const role = String(c?.role || "").toUpperCase();
    const effectiveOnline = computeEffectiveOnline({ online: c?.online, lastSeenAt: c?.lastSeenAt });
    const presenceText = getPresenceText({ online: effectiveOnline, lastSeenAt: c?.lastSeenAt });
    const meta = role === "EMPLOYEE" ? (String(c?.meta || "").trim() || "Employé du dentiste") : "";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 1, lineHeight: 1.1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, lineHeight: 1.1 }}>
          <div style={{ fontWeight: 800, fontSize: 13, lineHeight: 1.1, color: "#111827" }}>{c?.name || "-"}</div>
          {badge ? <span className="context-badge">{badge}</span> : null}
        </div>
        {meta ? <div style={{ fontSize: 11, lineHeight: 1.1, color: "#64748b" }}>{meta}</div> : null}
        <div
          style={{
            fontSize: 11,
            lineHeight: 1.1,
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
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{presenceText}</span>
        </div>
      </div>
    );
  };

  if (loading) {
    return <DentistPageSkeleton title={title} subtitle="Chargement" variant="table" />;
  }

  return (
    <div className="patients-container">
      <PageHeader title={title} subtitle={subtitle} />

      <div className="cp-admin-support-grid cp-admin-support-grid--messaging">
        <div className="cp-admin-support-panel">
          <div className="cp-admin-support-panel-header">
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Conversations</div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div className="search-group" style={{ flex: 1, maxWidth: "none" }}>
                <Search className="search-icon" size={16} />
                <input
                  type="text"
                  value={conversationQuery}
                  onChange={(e) => setConversationQuery(e.target.value)}
                  placeholder="Rechercher..."
                  style={{ paddingRight: String(conversationQuery || "").trim() ? 36 : undefined }}
                />
                {String(conversationQuery || "").trim() ? (
                  <button
                    type="button"
                    onClick={() => setConversationQuery("")}
                    aria-label="Effacer"
                    style={{
                      position: "absolute",
                      right: 12,
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

              {!hideContactTypeSelector ? (
                <div style={{ minWidth: 180 }}>
                  <ModernDropdown
                    value={effectiveContactType}
                    options={contactTypeOptions}
                    onChange={(v) => {
                      if (forcedContactType) return;
                      setContactType(v);
                    }}
                    ariaLabel="Filtrer les conversations"
                    fullWidth
                  />
                </div>
              ) : null}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>{filteredContacts.length} résultat(s)</div>
          </div>
          <div className="cp-admin-support-panel-body">
            {(filteredContacts || []).length === 0 ? (
              <div style={{ padding: 12 }} className="text-sm text-gray-600">
                Aucun résultat.
              </div>
            ) : (
              (filteredContacts || []).map((c) => {
                 const key = String(c?.userPublicId || "");
                 const isAdminGroup = !!c?.isAdminGroup;
                 const thread = isAdminGroup ? null : threadsByOtherId[key] || null;
                 const unread = isAdminGroup ? 0 : Number(thread?.unreadCount || 0);
                 const dt = isAdminGroup ? formatDateTime(adminGroupLastMessage?.createdAt) : formatDateTime(thread?.lastMessageAt);
                 const senderLabel = isAdminGroup
                   ? (adminGroupLastMessage?.senderName || "Quelqu'un")
                   : thread?.lastMessageFromViewer
                     ? "Vous"
                     : (c?.name || thread?.otherName || "Quelqu'un");
                 const preview = isAdminGroup
                   ? (adminGroupLastMessage?.content ? `${senderLabel} : ${adminGroupLastMessage.content}` : "Nouvelle conversation")
                   : thread?.lastMessagePreview
                     ? `${senderLabel} : ${thread.lastMessagePreview}`
                     : "Nouvelle conversation";
                 const isActive = isAdminGroup
                   ? isAdminGroupSelected
                   : (thread?.id && String(thread.id) === String(selectedThreadId)) ||
                     (!thread?.id && String(selectedOtherPublicId || "") === key);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectContact(c)}
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
                    {contactLabel(c)}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 6 }}>
                      <div style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                        {preview}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
                        {dt ? <span style={{ fontSize: 11, color: "#94a3b8" }}>{dt}</span> : null}
                        {unread > 0 ? <span className="cp-unread-pill">{unread > 99 ? "+99" : unread}</span> : null}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="cp-admin-support-panel">
            <div className="cp-admin-support-panel-header">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  {otherDetailsPath ? (
                    <button
                      type="button"
                      onClick={() => navigate(otherDetailsPath)}
                      style={{
                        fontWeight: 800,
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        textAlign: "left",
                        color: "#111827",
                        cursor: "pointer",
                      }}
                      title="Ouvrir le profil"
                    >
                      {isAdminGroupSelected ? "Tous les admins" : selectedThread?.otherName || "Conversation"}
                    </button>
                  ) : (
                    <div style={{ fontWeight: 800 }}>{isAdminGroupSelected ? "Tous les admins" : selectedThread?.otherName || "Conversation"}</div>
                  )}
                  {isAdminGroupSelected ? (
                    <span className="context-badge">Groupe</span>
                  ) : selectedThread?.otherBadge ? (
                    <span className="context-badge">{selectedThread.otherBadge}</span>
                  ) : null}
                </div>

                <div style={{ position: "relative" }} ref={threadMenuRef}>
                  <button
                    type="button"
                    className="cp-icon-btn cp-icon-btn--ghost"
                    aria-label="Options"
                    onClick={() => setThreadMenuOpen((v) => !v)}
                  >
                    <MoreVertical size={16} />
                  </button>

                  {threadMenuOpen ? (
                    <ul
                      className="dropdown-menu"
                      role="menu"
                      aria-label="Options messagerie"
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
              {(() => {
                const otherId = selectedThread?.otherUserPublicId ? String(selectedThread.otherUserPublicId) : "";
                if (!otherId) return null;
                const c = (contacts || []).find((x) => String(x?.userPublicId || "") === otherId) || null;
                const online = c?.online ?? selectedThread?.otherOnline ?? false;
                const lastSeenAt = c?.lastSeenAt ?? selectedThread?.otherLastSeenAt ?? null;
                const effectiveOnline = computeEffectiveOnline({ online, lastSeenAt });
                const text = getPresenceText({ online: effectiveOnline, lastSeenAt });
                const role = String(c?.role || "").toUpperCase();
                const meta = role === "EMPLOYEE" ? (String(c?.meta || "").trim() || "Employé du dentiste") : "";
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 1, lineHeight: 1.1 }}>
                    {meta ? <div style={{ fontSize: 12, lineHeight: 1.1, color: "#64748b" }}>{meta}</div> : null}
                    <div
                      style={{
                        fontSize: 12,
                        lineHeight: 1.1,
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
                    </div>
                  </div>
                );
              })()}

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
                  placeholder="Rechercher…"
                  className="w-full pr-10 py-2 rounded-xl border border-gray-300"
                  style={{ paddingLeft: 35 }}
                  disabled={!selectedThreadId}
                />
                {String(messageQuery || "").trim() ? (
                  <button
                    type="button"
                    onClick={() => setMessageQuery("")}
                    aria-label="Effacer"
                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", color: "#64748b" }}
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
            <div className="cp-chat-box">
              {!selectedThreadId ? (
                <div className="text-sm text-gray-600">Choisissez un contact pour commencer.</div>
              ) : (messages || []).length === 0 ? (
                <div className="text-sm text-gray-600">Écrivez votre premier message.</div>
              ) : (
                (messages || []).map((m) => {
                  const isTmp = String(m?.id || "").startsWith("tmp-");
                  const mineBubble = isTmp || (myPublicId && String(m?.senderPublicId || "") === myPublicId);
                  const isSending = String(m?.clientStatus || "").toUpperCase() === "SENDING";
                  const isRead = !!m.readByOther;
                  const checkColor = isRead ? "#3498db" : "#94a3b8";
                  const checkLabel = isSending ? "✓" : "✓✓";
                  const messageId = String(m?.id || "");
                  const isMatch = !!messageNeedle && String(m?.content || "").toLowerCase().includes(messageNeedle);
                  const isActiveMatch = isMatch && matchMessageIds[activeMatchIndex] && matchMessageIds[activeMatchIndex] === messageId;

                  return (
                    <div
                      key={m.id}
                      style={{
                        display: "flex",
                        justifyContent: mineBubble ? "flex-end" : "flex-start",
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
                          background: mineBubble ? "#e0f2fe" : "#f8fafc",
                          border:
                            "1px solid " +
                            (isActiveMatch ? "#f59e0b" : mineBubble ? "#7dd3fc" : isMatch ? "#fbbf24" : "#e2e8f0"),
                          color: "#0f172a",
                        }}
                      >
                        {!mineBubble ? (
                          null
                        ) : null}

                        <div style={{ fontSize: 13, lineHeight: 1.35, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                          {messageNeedle ? renderHighlighted(m.content, messageNeedle) : m.content}
                        </div>
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 11,
                            color: "#6b7280",
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 6,
                            alignItems: "center",
                          }}
                        >
                          <span>{formatDateTime(m?.createdAt)}</span>
                          {mineBubble ? (
                            <span className="cp-msg-checks" style={{ color: checkColor }}>
                              {checkLabel}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendChat} className="flex gap-2" style={{ marginTop: 12 }}>
              <input
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Écrire un message..."
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
      </div>
    </div>
  );
};

export default MessagingCenter;
