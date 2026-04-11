import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Send, ChevronDown } from "react-feather";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { formatDateTimeByPreference } from "../utils/dateFormat";
import { currency } from "../utils/format";
import { getApiErrorMessage } from "../utils/error";
import api from "../services/authService";
import { ensureMessagingThreadWith, listMessagingThreads, sendMessagingThreadMessage } from "../services/messagingService";
import {
  getNotificationsUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notificationService";
import { ensureWebPushSubscription, isWebPushSupported } from "../pwa/pushMessaging";
import "./NotificationBell.css";

const POLL_MS = 15000;
const DEFAULT_LIMIT = 12;

const safeJson = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const roleLabel = (role) => {
  const r = safeStr(role).trim().toUpperCase();
  if (!r) return "";
  if (r === "LAB") return "Laboratoire";
  if (r === "EMP" || r === "EMPLOYEE") return "Employé";
  if (r === "DENT" || r === "DENTIST") return "Dentiste";
  if (r === "ADMIN") return "Admin";
  return "";
};

const safeInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const safeStr = (v) => String(v == null ? "" : v);

const NotificationBell = ({ limit = DEFAULT_LIMIT, className = "", variant = "sidebar" }) => {
  const navigate = useNavigate();

  const btnRef = useRef(null);
  const dropdownRef = useRef(null);
  const pollRef = useRef(null);
  const disposedRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const messagingMetaRef = useRef({});
  const replyInputRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [serverUnreadCount, setServerUnreadCount] = useState(0);
  const [fallbackUnreadCount, setFallbackUnreadCount] = useState(0);
  const [actedNav, setActedNav] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cp_acted_notifs') || '{}');
    } catch {
      return {};
    }
  });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [replyOpenId, setReplyOpenId] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [fetchLimit, setFetchLimit] = useState(Math.max(1, safeInt(limit) || DEFAULT_LIMIT));
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [inlineBusyKey, setInlineBusyKey] = useState(null);
  const [pushCtaVisible, setPushCtaVisible] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [hudNotification, setHudNotification] = useState(null);
  const hudTimerRef = useRef(null);

  const fetchLimitRef = useRef(fetchLimit);
  const hasMoreRef = useRef(hasMore);

  const pageSize = useMemo(() => Math.max(1, safeInt(limit) || DEFAULT_LIMIT), [limit]);

  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
    };
  }, []);

  useEffect(() => {
    fetchLimitRef.current = fetchLimit;
  }, [fetchLimit]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    if (open) return;
    setFetchLimit(pageSize);
    setHasMore(true);
  }, [open, pageSize]);

  const displayUnreadCount = useMemo(() => {
    return serverUnreadCount > 0 ? serverUnreadCount : fallbackUnreadCount;
  }, [serverUnreadCount, fallbackUnreadCount]);

  const badgeLabel = useMemo(() => {
    if (!displayUnreadCount) return "";
    if (displayUnreadCount > 99) return "99+";
    return String(displayUnreadCount);
  }, [displayUnreadCount]);

  const buildMessagingUrl = (otherPublicId) => {
    const raw = safeStr(window?.location?.pathname);
    const base = raw.startsWith("/admin/") ? "/admin/messagerie" : raw.startsWith("/lab/") ? "/lab/messagerie" : "/messagerie";
    const withId = safeStr(otherPublicId).trim();
    if (!withId) return base;
    return `${base}?with=${encodeURIComponent(withId)}`;
  };

  const extractWithPublicId = (url) => {
    const raw = safeStr(url).trim();
    if (!raw) return "";
    try {
      const u = new URL(raw, window.location.origin);
      return safeStr(u.searchParams.get("with")).trim();
    } catch {
      return "";
    }
  };

  const refreshMessagingMeta = async () => {
    try {
      const threads = await listMessagingThreads();
      const next = {};
      for (const t of Array.isArray(threads) ? threads : []) {
        const withId = safeStr(t?.otherUserPublicId).trim();
        if (!withId) continue;
        next[withId] = {
          otherRole: safeStr(t?.otherRole).trim(),
          otherBadge: safeStr(t?.otherBadge).trim(),
        };
      }
      messagingMetaRef.current = next;
    } catch {
      // ignore
    }
  };

  const buildFallbackItems = ({ messagingThreads }) => {
    const nextItems = [];

    const messaging = Array.isArray(messagingThreads) ? messagingThreads : [];
    const unreadMessaging = messaging
      .filter((t) => Number(t?.unreadCount || 0) > 0)
      .sort((a, b) => new Date(b?.lastMessageAt || 0) - new Date(a?.lastMessageAt || 0))
      .slice(0, Math.max(1, Math.min(8, pageSize)));

    for (const t of unreadMessaging) {
      const threadId = safeStr(t?.id);
      const otherName = safeStr(t?.otherName).trim();
      const preview = safeStr(t?.lastMessagePreview).trim();
      const otherPublicId = safeStr(t?.otherUserPublicId).trim();
      const createdAt = t?.lastMessageAt || null;
      const unread = safeInt(t?.unreadCount);
      const data = JSON.stringify({
        otherRole: safeStr(t?.otherRole).trim() || undefined,
        otherBadge: safeStr(t?.otherBadge).trim() || undefined,
      });
      nextItems.push({
        id: `local-messaging-${threadId || otherPublicId || Math.random().toString(16).slice(2)}`,
        type: "MESSAGING_MESSAGE",
        title: otherName || "Messagerie",
        body: preview || (unread > 1 ? `${unread} messages non lus` : unread === 1 ? "1 message non lu" : ""),
        url: buildMessagingUrl(otherPublicId),
        data,
        createdAt,
        readAt: null,
        __local: true,
      });
    }

    return nextItems;
  };

  const refreshFallback = async () => {
    const [messagingRes] = await Promise.allSettled([listMessagingThreads()]);
    if (disposedRef.current) return { items: [], unreadCount: 0 };

    const messagingThreads = messagingRes.status === "fulfilled" ? messagingRes.value : [];
    try {
      const next = {};
      for (const t of Array.isArray(messagingThreads) ? messagingThreads : []) {
        const withId = safeStr(t?.otherUserPublicId).trim();
        if (!withId) continue;
        next[withId] = {
          otherRole: safeStr(t?.otherRole).trim(),
          otherBadge: safeStr(t?.otherBadge).trim(),
        };
      }
      messagingMetaRef.current = next;
    } catch {
      // ignore
    }

    const fallbackItems = buildFallbackItems({ messagingThreads });
    const fallbackCount = fallbackItems.length;

    setFallbackUnreadCount(fallbackCount);
    return { items: fallbackItems, unreadCount: fallbackCount };
  };

  const refreshServerUnreadCount = async () => {
    try {
      const data = await getNotificationsUnreadCount();
      const c = safeInt(data?.unreadCount);
      setServerUnreadCount(c);
      return c;
    } catch {
      // ignore
      return null;
    }
  };

  const refreshList = async ({ silent = false, limitOverride } = {}) => {
    const limitToUse = Math.max(1, safeInt(limitOverride ?? fetchLimitRef.current ?? pageSize));
    try {
      if (!silent) setLoading(true);
      const data = await listNotifications({ limit: limitToUse });
      const serverItems = Array.isArray(data) ? data : [];
      if (serverItems.length > 0) {
        setHasMore(serverItems.length >= limitToUse);
        setFetchLimit(limitToUse);
        setItems(serverItems);
        return;
      }

      // Fallback: if unread exists but the list is empty (or backend doesn't generate in-app notifications),
      // show unread messaging/support threads so the dropdown isn't blank.
      const fallback = await refreshFallback();
      setHasMore(false);
      setFetchLimit(limitToUse);
      if (fallback.items.length > 0) {
        setItems(fallback.items);
      } else {
        setItems([]);
      }
    } catch (err) {
      if (!silent) toast.error(getApiErrorMessage(err, "Impossible de charger les notifications"));
      try {
        const fallback = await refreshFallback();
        if (fallback.items.length > 0) setItems(fallback.items);
      } catch {
        // ignore
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const close = () => {
    setOpen(false);
    setReplyOpenId(null);
    setReplyDraft("");
  };

  const toggle = async () => {
    setOpen((prev) => !prev);
  };

  const handleEnablePush = async (e) => {
    e?.stopPropagation?.();
    if (pushBusy) return;
    setPushBusy(true);
    try {
      const res = await ensureWebPushSubscription({ prompt: true }).catch(() => ({ ok: false }));
      if (res?.ok) {
        toast.success("Notifications activées sur cet appareil");
        setPushCtaVisible(false);
      } else {
        toast.error("Impossible d'activer les notifications");
      }
    } finally {
      setPushBusy(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    let bootTimer = null;

    const boot = async () => {
      const c = await refreshServerUnreadCount();
      if (cancelled) return;

      if ((c ?? 0) <= 0) await refreshFallback();

      // If we couldn't read unread-count yet (token race on boot), retry quickly a few times.
      if (c == null && tries < 8) {
        tries += 1;
        bootTimer = setTimeout(() => {
          boot();
        }, 800);
      }
    };

    boot();
    pollRef.current = setInterval(() => {
      refreshServerUnreadCount();
      if (open) refreshList({ silent: true, limitOverride: fetchLimitRef.current });
    }, POLL_MS);
    return () => {
      cancelled = true;
      if (bootTimer) clearTimeout(bootTimer);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pageSize]);

  useEffect(() => {
    const onPing = () => {
      (async () => {
        const c = await refreshServerUnreadCount();
        if ((c ?? 0) <= 0) await refreshFallback();
        if (open) refreshList({ silent: true, limitOverride: fetchLimitRef.current });
      })();
    };
    window.addEventListener("CP_NOTIFICATIONS_PING", onPing);
    return () => {
      window.removeEventListener("CP_NOTIFICATIONS_PING", onPing);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pageSize]);

  useEffect(() => {
    const onCreated = (event) => {
      const n = event?.detail;
      if (!n || n.id == null) return;

      if (!n?.readAt) {
        setServerUnreadCount((prev) => prev + 1);
        if (!open && variant === "top") {
          setHudNotification(n);
          if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
          hudTimerRef.current = setTimeout(() => {
            setHudNotification(null);
          }, 6000);
        }
      }

      if (open) {
        setItems((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          const next = [n, ...list.filter((x) => x?.id !== n.id)];
          const limitNow = Math.max(1, safeInt(fetchLimitRef.current || pageSize));
          return next.slice(0, limitNow);
        });
      }
    };
    window.addEventListener("CP_NOTIFICATION_CREATED", onCreated);
    return () => window.removeEventListener("CP_NOTIFICATION_CREATED", onCreated);
  }, [open, pageSize, variant]);

  useEffect(() => {
    if (!open) {
      setPushCtaVisible(false);
      setPushBusy(false);
      return;
    }
    if (!isWebPushSupported()) {
      setPushCtaVisible(false);
      return;
    }

    let cancelled = false;
    (async () => {
      if (Notification.permission === "granted") {
        await ensureWebPushSubscription({ prompt: false }).catch(() => { });
        if (!cancelled) setPushCtaVisible(false);
        return;
      }
      if (Notification.permission !== "default") {
        if (!cancelled) setPushCtaVisible(false);
        return;
      }
      const probe = await ensureWebPushSubscription({ prompt: false }).catch(() => ({ ok: false }));
      if (cancelled) return;
      if (probe?.reason === "missing_public_key") {
        setPushCtaVisible(false);
        return;
      }
      setPushCtaVisible(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    loadingMoreRef.current = false;
    setLoadingMore(false);
    refreshList({ silent: false, limitOverride: pageSize });
    refreshServerUnreadCount();
    refreshMessagingMeta();
    const onMouseDown = (event) => {
      const target = event?.target;
      if (!target) return;
      if (btnRef.current && btnRef.current.contains(target)) return;
      if (dropdownRef.current && dropdownRef.current.contains(target)) return;
      close();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pageSize]);

  useEffect(() => {
    if (open) return;
    setReplyOpenId(null);
    setReplyDraft("");
  }, [open]);

  useEffect(() => {
    if (!replyOpenId) return;
    const t = setTimeout(() => {
      replyInputRef.current?.focus?.();
      replyInputRef.current?.select?.();
    }, 0);
    return () => clearTimeout(t);
  }, [replyOpenId]);

  const dropdownStyle = useMemo(() => {
    if (!open && !hudNotification) return null;
    const rect = btnRef.current?.getBoundingClientRect?.();
    const r = rect || { top: 60, right: 70, bottom: 60, left: 10, height: 32, width: 32 };
    const width = Math.min(520, Math.max(260, window.innerWidth - 16));
    const top = Math.min(r.bottom + 10, window.innerHeight - 460);

    const sidebarWidth = 70;
    const contentCenter = sidebarWidth + (window.innerWidth - sidebarWidth) / 2;
    const centeredLeft = Math.min(Math.max(sidebarWidth + 8, contentCenter - width / 2), window.innerWidth - width - 8);
    const left = variant === "top" ? centeredLeft : Math.min(r.right + 12, window.innerWidth - width - 8);
    const arrowLeft = Math.min(Math.max(18, r.left + r.width / 2 - left), width - 18);

    return { left, top, width, "--cp-notif-arrow-left": `${arrowLeft}px` };
  }, [open, variant, hudNotification]);

  const handleListScroll = (event) => {
    const el = event?.currentTarget;
    if (!el) return;

    const nextTop = el.scrollTop;
    const prevTop = lastScrollTopRef.current;
    lastScrollTopRef.current = nextTop;
    if (nextTop <= prevTop) return;

    const distance = el.scrollHeight - (el.scrollTop + el.clientHeight);
    if (distance > 40) return;
    if (!open) return;
    if (loading) return;
    if (loadingMoreRef.current) return;
    if (!hasMoreRef.current) return;

    const nextLimit = fetchLimitRef.current + pageSize;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    (async () => {
      try {
        await new Promise((r) => setTimeout(r, 250));
        await refreshList({ silent: true, limitOverride: nextLimit });
      } finally {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    })();
  };

  const handleClickNotification = async (n) => {
    const id = n?.id;
    const url = String(n?.url || "/").trim() || "/";
    try {
      if (!n?.__local && id != null) {
        await markNotificationRead(id);
        setItems((prev) =>
          (Array.isArray(prev) ? prev : []).map((x) => (x?.id === id ? { ...x, readAt: x?.readAt || new Date().toISOString() } : x))
        );
        setServerUnreadCount((prev) => Math.max(0, prev - (n?.readAt ? 0 : 1)));
      } else if (n?.__local) {
        setItems((prev) =>
          (Array.isArray(prev) ? prev : []).map((x) => (x?.id === id ? { ...x, readAt: x?.readAt || new Date().toISOString() } : x))
        );
        setFallbackUnreadCount((prev) => Math.max(0, prev - (n?.readAt ? 0 : 1)));
      }
    } catch {
      // ignore
    } finally {
      close();
      navigate(url);
    }
  };

  const handleMarkAllRead = async (e) => {
    e?.stopPropagation?.();
    try {
      await markAllNotificationsRead();
      setItems((prev) => {
        const nowIso = new Date().toISOString();
        return (Array.isArray(prev) ? prev : []).map((x) => (x?.readAt ? x : { ...x, readAt: nowIso }));
      });
      setServerUnreadCount(0);
      setFallbackUnreadCount(0);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Impossible de marquer toutes les notifications comme lues"));
    }
  };

  const applyReadLocal = (n, readAtIso) => {
    const id = n?.id;
    if (id == null) return;
    const nowIso = readAtIso || new Date().toISOString();

    setItems((prev) =>
      (Array.isArray(prev) ? prev : []).map((x) => (x?.id === id ? { ...x, readAt: x?.readAt || nowIso } : x))
    );

    if (n?.__local) {
      setFallbackUnreadCount((prev) => Math.max(0, prev - (n?.readAt ? 0 : 1)));
    } else {
      setServerUnreadCount((prev) => Math.max(0, prev - (n?.readAt ? 0 : 1)));
    }
  };

  const handleInlineAction = async (n, action) => {
    const method = safeStr(action?.method).trim().toLowerCase() || "post";
    const url = safeStr(action?.url).trim();
    const actionId = safeStr(action?.id || action?.label || method).trim() || "action";
    const key = `${String(n?.id ?? "local")}:${actionId}`;
    if (!url) return;
    if (inlineBusyKey) return;

    setInlineBusyKey(key);
    try {
      await api.request({ method, url });
      if (!n?.__local && n?.id != null && !n?.readAt) {
        await markNotificationRead(n.id).catch(() => { });
      }
      applyReadLocal(n);

      const decisionText = action.variant === "approve" ? "APPROVED" : action.variant === "reject" ? "REJECTED" : null;
      if (decisionText && n?.id) {
        setActedNav((prev) => {
          const next = { ...prev, [n.id]: decisionText };
          try {
            localStorage.setItem("cp_acted_notifs", JSON.stringify(next));
          } catch { }
          return next;
        });
      }

      toast.success("Action effectuée");
      window.dispatchEvent(new Event("CP_NOTIFICATIONS_PING"));
      close();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Action impossible"));
    } finally {
      setInlineBusyKey(null);
    }
  };

  const handleSendReply = async (n, itemId) => {
    const content = safeStr(replyDraft).trim();
    if (!content) return;
    if (inlineBusyKey) return;

    const key = `${String(itemId || n?.id || "reply")}:send`;
    setInlineBusyKey(key);
    try {
      const withPublicId = extractWithPublicId(n?.url);
      if (!withPublicId) {
        toast.error("Conversation introuvable");
        return;
      }

      const thread = await ensureMessagingThreadWith(withPublicId);
      const threadId = thread?.id;
      if (threadId == null) {
        toast.error("Conversation introuvable");
        return;
      }

      await sendMessagingThreadMessage(threadId, content);

      if (!n?.__local && n?.id != null && !n?.readAt) {
        await markNotificationRead(n.id).catch(() => { });
      }
      applyReadLocal(n);
      toast.success("Message envoyé");
      close();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Impossible d'envoyer le message"));
    } finally {
      setInlineBusyKey(null);
    }
  };

  const toggleReply = (id) => {
    setReplyOpenId((prev) => {
      const next = prev === id ? null : id;
      setReplyDraft("");
      return next;
    });
  };

  const renderNotificationItem = (n, isHUD = false) => {
    const unread = !n?.readAt;
    const type = safeStr(n?.type).toUpperCase();
    const title = String(n?.title || "Notification").trim();
    const body = String(n?.body || "").trim();
    const createdAt = n?.createdAt ? formatDateTimeByPreference(n.createdAt) : "";
    const meta = safeJson(n?.data);
    const withPublicId = extractWithPublicId(n?.url);
    const inferred = withPublicId ? messagingMetaRef.current?.[withPublicId] : null;
    const actions = Array.isArray(meta?.actions) ? meta.actions : [];
    const isMessagingMessage = type === "MESSAGING_MESSAGE";
    const isLabPaymentCreated = type === "LAB_PAYMENT_UPDATED" && meta?.action === "CREATED";
    const isProthesisStatusUpdated = type === "PROTHESIS_STATUS_UPDATED" && meta?.action === "STATUS_CHANGED";
    const localDecision = actedNav[n?.id];
    if (localDecision && meta) {
      meta.decision = localDecision;
    }

    const isCancelRequested = (type === "PROTHESIS_CANCELLATION_REQUESTED" || type === "LAB_PAYMENT_CANCELLATION_REQUESTED") && meta?.action === "CANCEL_REQUESTED";
    const isCancelDecided = (type === "PROTHESIS_CANCELLATION_DECIDED" || type === "LAB_PAYMENT_CANCELLATION_DECIDED") && meta?.action === "CANCEL_DECIDED";
    const isCancelAction = isCancelRequested || isCancelDecided;
    const showMessageStyle = isMessagingMessage || isLabPaymentCreated || isProthesisStatusUpdated || isCancelAction;

    let displayTitle = title;
    let displayBody = body;
    let displayRole = roleLabel(meta?.otherRole || inferred?.otherRole);

    if (isLabPaymentCreated || isProthesisStatusUpdated || isCancelAction) {
      if (!displayRole) displayRole = meta?.otherRole === "LAB" ? "Laboratoire" : "Dentiste";
      if (displayTitle === "Nouveau paiement laboratoire" || displayTitle === "Cabinet Dentaire" || displayTitle === "Prothèse · Mise à jour" || displayTitle.toLowerCase().includes("annulation")) {
        displayTitle = meta?.otherRole === "LAB" ? "Laboratoire" : "Cabinet Dentaire";
      }
      if (isLabPaymentCreated) {
        if (meta?.amount != null) {
          displayBody = currency(meta.amount);
        } else if (displayBody === "Un paiement a été ajouté par le cabinet." || displayBody === "Paiement ajouté" || String(displayBody).endsWith("MAD")) {
          displayBody = "- " + (currency(0).replace(/[0-9.,]/g, '').trim() || "MAD");
        }
      } else if (isCancelAction) {
        if (isCancelRequested && meta?.otherRole === "LAB") {
          displayBody = body;
        } else {
          displayBody = "";
        }
      } else {
        displayBody = body;
      }
    }
    const itemId = String(n?.id ?? `${title}-${createdAt}`);
    return (
      <div
        key={itemId}
        className={`cp-notif-item ${unread && !isHUD ? "unread" : ""} ${isHUD ? "is-hud" : ""}`.trim()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClickNotification(n);
          }
        }}
        onClick={() => handleClickNotification(n)}
        style={isHUD ? { boxShadow: "0 12px 32px rgba(0,0,0,0.12)", margin: 0, pointerEvents: "auto" } : undefined}
      >
        {showMessageStyle ? (
          <>
            <div className="cp-notif-msg-head">
              <div className="cp-notif-msg-name">
                <span className="cp-notif-msg-nameText">{displayTitle}</span>
                <span className="cp-notif-msg-subInline">
                  {isLabPaymentCreated
                    ? " a ajouté un paiement"
                    : isProthesisStatusUpdated
                      ? (meta?.prothesisStatus === "SENT_TO_LAB" ? " a envoyé une prothèse" :
                        meta?.prothesisStatus === "PRETE" ? " a préparé une prothèse" :
                          meta?.prothesisStatus === "RECEIVED" ? " a reçu une prothèse" :
                            " a mis à jour une prothèse")
                      : isCancelRequested
                        ? (meta?.otherRole === "LAB" ? "" : (type.includes("PROTHESIS") ? " a demandé l'annulation d'une prothèse" : " a demandé l'annulation d'un paiement"))
                        : isCancelDecided
                          ? (meta?.decision === "APPROVED" ? " a approuvé l'annulation" : " a rejeté l'annulation")
                          : " a envoyé un message"}</span>
              </div>
              {displayRole ? <div className="cp-notif-msg-role">{displayRole}</div> : null}
            </div>
            {displayBody || isCancelAction ? (
              <div className="cp-notif-msg-body">
                {displayBody ? <div className="cp-notif-msg-text">{isLabPaymentCreated ? displayBody : isProthesisStatusUpdated ? displayBody : (displayBody ? "Message : " + displayBody : "")}</div> : null}
                <div className="cp-notif-msg-time" style={!displayBody ? { marginLeft: "auto" } : {}}>{createdAt}</div>
              </div>
            ) : null}
            {!isLabPaymentCreated && !isProthesisStatusUpdated && !isCancelAction && (
              <div className="cp-notif-msg-footer">
                {replyOpenId === itemId ? (
                  <div
                    className="cp-notif-replyrow"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <input
                      className="cp-notif-replybox-input"
                      type="text"
                      placeholder="Écrire une réponse…"
                      autoFocus
                      ref={replyInputRef}
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") toggleReply(itemId);
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSendReply(n, itemId);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="cp-notif-sendBtn"
                      aria-label="Envoyer"
                      disabled={!!inlineBusyKey || !safeStr(replyDraft).trim()}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendReply(n, itemId);
                      }}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="cp-notif-msg-reply"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleReply(itemId);
                    }}
                  >
                    Répondre
                  </button>
                )}
              </div>
            )}
            {isCancelRequested && meta?.decision === "PENDING" && actions.length > 0 && (
              <div
                className="cp-notif-actions cp-notif-actions--inline"
                onClick={(e) => e.stopPropagation()}
              >
                {actions.map((a, idx) => {
                  const actionKey = `${String(n?.id ?? "local")}:${safeStr(a?.id || a?.label || idx).trim() || idx}`;
                  const disabled = !!inlineBusyKey;
                  const label = safeStr(a?.label || a?.id || "Action").trim() || "Action";
                  const variant = safeStr(a?.variant || a?.id).toLowerCase();
                  return (
                    <button
                      key={actionKey}
                      type="button"
                      className={`cp-notif-actionBtn ${variant === "approve" ? "primary" : variant === "reject" ? "danger" : ""}`.trim()}
                      disabled={disabled}
                      onClick={() => handleInlineAction(n, a)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
            {isCancelRequested && meta?.decision !== "PENDING" && (
              <div className={`cp-notif-decision-text ${meta?.decision === "APPROVED" ? "approved" : "rejected"}`.trim()}>
                {meta?.decision === "APPROVED" ? "Approuvée" : "Rejetée"}
              </div>
            )}
            {isCancelDecided && (
              <div className={`cp-notif-decision-text ${meta?.decision === "APPROVED" ? "approved" : "rejected"}`.trim()}>
                {meta?.decision === "APPROVED" ? "Approuvée" : "Rejetée"}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="cp-notif-row">
              <div className="cp-notif-item-title">{title}</div>
              <div className="cp-notif-time">{createdAt}</div>
            </div>
            {body ? <div className="cp-notif-body">{body}</div> : null}
            {actions.length > 0 ? (
              <div
                className="cp-notif-actions"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                {actions.map((a, idx) => {
                  const actionKey = `${String(n?.id ?? "local")}:${safeStr(a?.id || a?.label || idx).trim() || idx}`;
                  const disabled = !!inlineBusyKey;
                  const label = safeStr(a?.label || a?.id || "Action").trim() || "Action";
                  const variant = safeStr(a?.variant || a?.id).toLowerCase();
                  return (
                    <button
                      key={actionKey}
                      type="button"
                      className={`cp-notif-actionBtn ${variant === "approve" ? "primary" : variant === "reject" ? "danger" : ""}`.trim()}
                      disabled={disabled}
                      onClick={() => handleInlineAction(n, a)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </>
        )}
      </div>
    );
  };

  return (
    <div className={`cp-notif ${variant === "top" ? "cp-notif--top" : ""} ${className}`.trim()}>
      {variant === "top" ? (
        <button
          ref={btnRef}
          type="button"
          className="cp-notif-top-pill"
          onClick={toggle}
          aria-haspopup="dialog"
          aria-expanded={open ? "true" : "false"}
          aria-label={displayUnreadCount > 0 ? `${displayUnreadCount} notification(s) non lue(s)` : "Notifications"}
        >
          <ChevronDown size={18} strokeWidth={2.5} className={`cp-notif-top-chevron ${open ? "open" : ""}`} />
          {displayUnreadCount > 0 ? <span className="cp-notif-top-badge">{badgeLabel}</span> : null}
        </button>
      ) : (
        <button
          ref={btnRef}
          type="button"
          className="cp-notif-btn"
          onClick={toggle}
          aria-haspopup="dialog"
          aria-expanded={open ? "true" : "false"}
          aria-label={displayUnreadCount > 0 ? `${displayUnreadCount} notification(s) non lue(s)` : "Notifications"}
        >
          <span className="cp-sidebar-icon">
            <Bell size={20} />
            {displayUnreadCount > 0 ? <span className="cp-sidebar-badge">{badgeLabel}</span> : null}
          </span>
        </button>
      )}

      {open ? (
        <>
          <div className="cp-notif-backdrop" onClick={close} />
          <div ref={dropdownRef} className="cp-notif-float" style={dropdownStyle || undefined} role="dialog" aria-label="Notifications">
            <div className="cp-notif-header">
              <div className="cp-notif-title">Notifications</div>
              <button
                type="button"
                className="cp-notif-markall"
                onClick={handleMarkAllRead}
                disabled={loading || displayUnreadCount <= 0}
              >
                Tout lire
              </button>
            </div>
            <div className="cp-notif-list cp-notif-list--float" onScroll={handleListScroll}>
              {loading ? <div className="cp-notif-empty">Chargement…</div> : null}
              {!loading && pushCtaVisible ? (
                <div className="cp-notif-pushCta" onClick={(e) => e.stopPropagation()}>
                  <div className="cp-notif-pushCta-text">
                    <div className="cp-notif-pushCta-title">Activer les notifications</div>
                    <div className="cp-notif-pushCta-sub">Recevez les alertes même si l'app est fermée.</div>
                  </div>
                  <button type="button" className="cp-notif-pushCta-btn" onClick={handleEnablePush} disabled={pushBusy}>
                    {pushBusy ? "..." : "Activer"}
                  </button>
                </div>
              ) : null}
              {!loading && items.length === 0 ? <div className="cp-notif-empty">Aucune notification.</div> : null}
              {!loading &&
                items.map((n) => renderNotificationItem(n))}
              {!loading && loadingMore ? <div className="cp-notif-empty">Chargement...</div> : null}
            </div>
          </div>
        </>
      ) : null}
      
      {hudNotification && !open ? (
        <div 
          className="cp-notif-hud-container" 
          style={{ 
            position: "fixed", 
            top: dropdownStyle?.top, 
            left: dropdownStyle?.left, 
            width: dropdownStyle?.width,
            animation: "slideNotifDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            transformOrigin: "top center",
            zIndex: 10005,
            pointerEvents: "none"
          }}
        >
          {renderNotificationItem(hudNotification, true)}
        </div>
      ) : null}
    </div>
  );
};

export default NotificationBell;





