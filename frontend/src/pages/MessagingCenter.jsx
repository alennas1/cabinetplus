import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, Search, Send, X } from "react-feather";
import { toast } from "react-toastify";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import ModernDropdown from "../components/ModernDropdown";
import { getApiErrorMessage } from "../utils/error";
import { formatDateTimeByPreference } from "../utils/dateFormat";
import {
  ensureMessagingThreadWith,
  getMessagingThreadMessages,
  listMessagingContacts,
  listMessagingThreads,
  sendMessagingThreadMessage,
} from "../services/messagingService";
import "./Patients.css";
import "./Patient.css";
import "./Support.css";

const POLL_SELECTED_MS = 5000;
const POLL_IDLE_MS = 12000;

const MessagingCenter = ({ title = "Messagerie", subtitle = "Discutez avec votre équipe et vos partenaires" }) => {
  const { user } = useSelector((state) => state.auth || {});
  const navigate = useNavigate();
  const myPublicId = user?.publicId ? String(user.publicId) : null;

  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [threads, setThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [selectedOtherPublicId, setSelectedOtherPublicId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [conversationQuery, setConversationQuery] = useState("");
  const [contactType, setContactType] = useState("ALL"); // ALL | EMPLOYEE | LAB | DENTIST
  const [messageQuery, setMessageQuery] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);

  const pollRef = useRef(null);
  const chatEndRef = useRef(null);
  const messageRefs = useRef({});

  const formatDateTime = (value) => {
    if (!value) return "";
    const label = formatDateTimeByPreference(value);
    return label === "-" ? "" : label;
  };

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
    const viewerRole = String(user?.role || "").toUpperCase();
    const otherPublicId = selectedThread?.otherUserPublicId ? String(selectedThread.otherUserPublicId) : "";
    const contact = otherPublicId
      ? (contacts || []).find((c) => String(c?.userPublicId || "") === otherPublicId) || null
      : null;

    const role = String(selectedThread?.otherRole || contact?.role || "").toUpperCase();
    const otherUserId = selectedThread?.otherUserId ?? contact?.userId ?? null;
    const otherOwnerDentistId = selectedThread?.otherOwnerDentistId ?? contact?.ownerDentistId ?? null;

    if (viewerRole === "DENTIST") {
      if (role === "EMPLOYEE" && otherUserId) return `/gestion-cabinet/employees/${otherUserId}`;
      if (role === "LAB" && otherUserId) return `/gestion-cabinet/laboratories/${otherUserId}`;
      return null;
    }

    if (viewerRole === "EMPLOYEE") {
      if (role === "DENTIST") return null;
      if (role === "LAB" && otherUserId) return `/gestion-cabinet/laboratories/${otherUserId}`;
      return null;
    }

    if (viewerRole === "LAB") {
      if (role === "DENTIST" && otherUserId) return `/lab/dentists/${otherUserId}`;
      if (role === "EMPLOYEE" && otherOwnerDentistId) return `/lab/dentists/${otherOwnerDentistId}`;
      return null;
    }

    return null;
  }, [contacts, selectedThread, user?.role]);

  const conversationNeedle = useMemo(() => String(conversationQuery || "").trim().toLowerCase(), [conversationQuery]);
  const messageNeedle = useMemo(() => String(messageQuery || "").trim().toLowerCase(), [messageQuery]);

  const contactTypeOptions = useMemo(() => {
    const base = [
      { value: "ALL", label: "Tous" },
      { value: "EMPLOYEE", label: "Employés" },
      { value: "LAB", label: "Laboratoires" },
      { value: "DENTIST", label: "Dentistes" },
    ];
    const role = String(user?.role || "").toUpperCase();
    if (role === "LAB") return base.filter((o) => o.value !== "LAB");
    return base;
  }, [user?.role]);

  useEffect(() => {
    const role = String(user?.role || "").toUpperCase();
    if (role === "LAB" && String(contactType || "").toUpperCase() === "LAB") {
      setContactType("ALL");
    }
  }, [contactType, user?.role]);

  const filteredContacts = useMemo(() => {
    const list = Array.isArray(contacts) ? contacts : [];
    const type = String(contactType || "ALL").toUpperCase();

    return list.filter((c) => {
      if (!c?.userPublicId) return false;
      const role = String(c?.role || "").toUpperCase();
      const badge = String(c?.badge || "").toLowerCase();

      if (type !== "ALL") {
        if (type === "EMPLOYEE" && role !== "EMPLOYEE") return false;
        if (type === "LAB" && role !== "LAB") return false;
        if (type === "DENTIST" && role !== "DENTIST") return false;
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
  }, [contacts, contactType, conversationNeedle, threadsByOtherId]);

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
      const contactsList = Array.isArray(c) ? c : [];
      const threadsList = Array.isArray(t) ? t : [];
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
      const data = await getMessagingThreadMessages(id);
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      if (!silent) toast.error(getApiErrorMessage(err, "Impossible de charger la conversation"));
    }
  };

  const openThreadWith = async (otherPublicId) => {
    if (!otherPublicId) return;
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
  }, [selectedThreadId]);

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

    const tmpId = `tmp-${Date.now()}`;
    const nowIso = new Date().toISOString();

    try {
      setSendingChat(true);
      setMessages((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        {
          id: tmpId,
          threadId: selectedThreadId,
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

      const saved = await sendMessagingThreadMessage(selectedThreadId, content);
      setMessages((prev) =>
        (Array.isArray(prev) ? prev : []).map((m) => (String(m?.id) === String(tmpId) ? { ...saved, clientStatus: "SENT" } : m))
      );
      await loadContactsAndThreads({ silent: true });
    } catch (err) {
      setMessages((prev) => (Array.isArray(prev) ? prev : []).filter((m) => String(m?.id) !== String(tmpId)));
      setChatText(content);
      toast.error(getApiErrorMessage(err, "Erreur lors de l'envoi du message"));
    } finally {
      setSendingChat(false);
    }
  };

  const contactLabel = (c) => {
    const badge = c?.badge || "";
    const role = String(c?.role || "").toUpperCase();
    const meta =
      role === "EMPLOYEE"
        ? (String(c?.meta || "").trim() || "Employé du dentiste")
        : "";
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#111827" }}>{c?.name || "-"}</div>
          {badge ? <span className="context-badge">{badge}</span> : null}
        </div>
        {meta ? <div style={{ marginTop: 6, fontSize: 11, color: "#64748b" }}>{meta}</div> : null}
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
                  value={conversationQuery}
                  onChange={(e) => setConversationQuery(e.target.value)}
                  placeholder="Rechercher…"
                  className="w-full pr-10 py-2 rounded-xl border border-gray-300"
                  style={{ paddingLeft: 35 }}
                />
                {String(conversationQuery || "").trim() ? (
                  <button
                    type="button"
                    onClick={() => setConversationQuery("")}
                    aria-label="Effacer"
                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", color: "#64748b" }}
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>

              <div style={{ minWidth: 180 }}>
                <ModernDropdown
                  value={contactType}
                  options={contactTypeOptions}
                  onChange={(v) => setContactType(v)}
                  ariaLabel="Filtrer les conversations"
                  fullWidth
                  triggerClassName="px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>{filteredContacts.length} résultat(s)</div>
          </div>
          <div style={{ overflowY: "auto" }}>
            {(filteredContacts || []).length === 0 ? (
              <div style={{ padding: 12 }} className="text-sm text-gray-600">
                Aucun résultat.
              </div>
            ) : (
              (filteredContacts || []).map((c) => {
                const key = String(c?.userPublicId || "");
                const thread = threadsByOtherId[key] || null;
                const unread = Number(thread?.unreadCount || 0);
                const isActive =
                  (thread?.id && String(thread.id) === String(selectedThreadId)) ||
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
                      <div style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {thread?.lastMessagePreview || "Nouvelle conversation"}
                      </div>
                      {unread > 0 ? <span className="cp-unread-pill">{unread > 99 ? "99+" : unread}</span> : null}
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{formatDateTime(thread?.lastMessageAt)}</div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="cp-admin-support-panel">
          <div className="cp-admin-support-panel-header">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
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
                  {selectedThread?.otherName || "Conversation"}
                </button>
              ) : (
                <div style={{ fontWeight: 800 }}>{selectedThread?.otherName || "Conversation"}</div>
              )}
              {selectedThread?.otherBadge ? <span className="context-badge">{selectedThread.otherBadge}</span> : null}
            </div>
            {(() => {
              const otherId = selectedThread?.otherUserPublicId ? String(selectedThread.otherUserPublicId) : "";
              const c = otherId ? (contacts || []).find((x) => String(x?.userPublicId || "") === otherId) : null;
              const role = String(c?.role || "").toUpperCase();
              if (role !== "EMPLOYEE") return null;
              const meta = String(c?.meta || "").trim() || "Employé du dentiste";
              return <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>{meta}</div>;
            })()}

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
