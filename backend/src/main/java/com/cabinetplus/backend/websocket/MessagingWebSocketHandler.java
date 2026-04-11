package com.cabinetplus.backend.websocket;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.cabinetplus.backend.dto.MessagingPresenceResponse;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.services.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.annotation.PreDestroy;

@Component
public class MessagingWebSocketHandler extends TextWebSocketHandler {

    private static final long OFFLINE_GRACE_MS = 60_000L;

    private final ObjectMapper objectMapper;
    private final MessagingWebSocketSessionRegistry sessionRegistry;
    private final UserService userService;
    private final UserRepository userRepository;

    private final ScheduledExecutorService scheduler;
    private final ConcurrentHashMap<String, ScheduledFuture<?>> pendingOfflineByPhone = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, LocalDateTime> pendingLastSeenAtByPhone = new ConcurrentHashMap<>();

    public MessagingWebSocketHandler(
            ObjectMapper objectMapper,
            MessagingWebSocketSessionRegistry sessionRegistry,
            UserService userService,
            UserRepository userRepository
    ) {
        this.objectMapper = objectMapper;
        this.sessionRegistry = sessionRegistry;
        this.userService = userService;
        this.userRepository = userRepository;

        this.scheduler = Executors.newSingleThreadScheduledExecutor(new ThreadFactory() {
            private final AtomicInteger n = new AtomicInteger(1);

            @Override
            public Thread newThread(Runnable r) {
                Thread t = new Thread(r);
                t.setName("messaging-presence-" + n.getAndIncrement());
                t.setDaemon(true);
                return t;
            }
        });
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        if (session == null || session.getPrincipal() == null || session.getPrincipal().getName() == null) {
            if (session != null && session.isOpen()) {
                session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Missing principal"));
            }
            return;
        }
        String rawPhone = session.getPrincipal().getName();
        String phoneKey = resolveCanonicalPhone(rawPhone);
        try {
            session.getAttributes().put(MessagingWebSocketSessionRegistry.PHONE_KEY_ATTR, phoneKey);
        } catch (Exception ignored) {
            // ignore
        }
        sessionRegistry.add(session);
        notifyPresenceOnline(phoneKey);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessionRegistry.remove(session);
        scheduleOfflineIfNeeded(resolvePhoneKey(session));
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        sessionRegistry.remove(session);
        scheduleOfflineIfNeeded(resolvePhoneKey(session));
        if (session != null && session.isOpen()) {
            session.close(CloseStatus.SERVER_ERROR);
        }
    }

    public boolean isOnline(String phone) {
        if (phone == null || phone.isBlank()) return false;
        String key = resolveCanonicalPhone(phone);
        if (sessionRegistry.isOnline(key)) return true;
        return !key.equals(phone) && sessionRegistry.isOnline(phone);
    }

    public boolean isOnlineForDisplay(String phone) {
        if (phone == null || phone.isBlank()) return false;
        String key = resolveCanonicalPhone(phone);
        if (sessionRegistry.isOnline(key)) return true;
        if (!key.equals(phone) && sessionRegistry.isOnline(phone)) return true;
        return pendingOfflineByPhone.containsKey(key);
    }

    public void sendToUser(String phone, Object event) {
        if (phone == null || phone.isBlank() || event == null) return;
        String key = resolveCanonicalPhone(phone);
        Set<WebSocketSession> sessions = sessionRegistry.getSessions(key);
        if (sessions.isEmpty() && !key.equals(phone)) {
            sessions = sessionRegistry.getSessions(phone);
        }
        if (sessions.isEmpty()) return;
        try {
            byte[] bytes = objectMapper.writeValueAsBytes(event);
            TextMessage msg = new TextMessage(new String(bytes, StandardCharsets.UTF_8));
            for (WebSocketSession s : sessions) {
                try {
                    if (s != null && s.isOpen()) s.sendMessage(msg);
                } catch (Exception ignored) {
                    // ignore individual socket failures
                }
            }
        } catch (Exception ignored) {
            // ignore serialization failures
        }
    }

    public void sendToAll(MessagingRealtimeEvent event) {
        if (event == null) return;
        Set<WebSocketSession> sessions = sessionRegistry.getAllSessions();
        if (sessions.isEmpty()) return;
        try {
            byte[] bytes = objectMapper.writeValueAsBytes(event);
            TextMessage msg = new TextMessage(new String(bytes, StandardCharsets.UTF_8));
            for (WebSocketSession s : sessions) {
                try {
                    if (s != null && s.isOpen()) s.sendMessage(msg);
                } catch (Exception ignored) {
                    // ignore individual socket failures
                }
            }
        } catch (Exception ignored) {
            // ignore serialization failures
        }
    }

    public void sendToAll(Object payload) {
        if (payload == null) return;
        Set<WebSocketSession> sessions = sessionRegistry.getAllSessions();
        if (sessions.isEmpty()) return;
        try {
            byte[] bytes = objectMapper.writeValueAsBytes(payload);
            TextMessage msg = new TextMessage(new String(bytes, StandardCharsets.UTF_8));
            for (WebSocketSession s : sessions) {
                try {
                    if (s != null && s.isOpen()) s.sendMessage(msg);
                } catch (Exception ignored) {
                    // ignore individual socket failures
                }
            }
        } catch (Exception ignored) {
            // ignore serialization failures
        }
    }

    @PreDestroy
    public void shutdownPresenceScheduler() {
        try {
            scheduler.shutdownNow();
        } catch (Exception ignored) {
            // ignore
        }
    }

    private void notifyPresenceOnline(String phone) {
        if (phone == null || phone.isBlank()) return;
        cancelPendingOffline(phone);

        userService.findByPhoneNumber(phone).ifPresent(user -> {
            if (user.getPublicId() == null) return;
            LocalDateTime now = LocalDateTime.now();
            user.setMessagingLastSeenAt(now);
            try {
                userRepository.save(user);
            } catch (Exception ignored) {
                // ignore persistence failures
            }
            sendToAll(new MessagingRealtimeEvent(
                    "PRESENCE_UPDATED",
                    null,
                    null,
                    new MessagingPresenceResponse(user.getPublicId(), true, now)
            ));
        });
    }

    private void cancelPendingOffline(String phone) {
        if (phone == null || phone.isBlank()) return;
        ScheduledFuture<?> f = pendingOfflineByPhone.remove(phone);
        pendingLastSeenAtByPhone.remove(phone);
        if (f != null) {
            try {
                f.cancel(false);
            } catch (Exception ignored) {
                // ignore
            }
        }
    }

    private void scheduleOfflineIfNeeded(String phone) {
        if (phone == null || phone.isBlank()) return;
        if (sessionRegistry.isOnline(phone)) return;
        if (pendingOfflineByPhone.containsKey(phone)) return;

        LocalDateTime disconnectedAt = LocalDateTime.now();
        pendingLastSeenAtByPhone.put(phone, disconnectedAt);

        userService.findByPhoneNumber(phone).ifPresent(user -> {
            user.setMessagingLastSeenAt(disconnectedAt);
            userRepository.save(user);
        });

        ScheduledFuture<?> f = scheduler.schedule(() -> {
            try {
                if (sessionRegistry.isOnline(phone)) return;
                LocalDateTime lastSeenAt = pendingLastSeenAtByPhone.getOrDefault(phone, disconnectedAt);

                userService.findByPhoneNumber(phone).ifPresent(user -> {
                    if (user.getPublicId() == null) return;
                    sendToAll(new MessagingRealtimeEvent(
                            "PRESENCE_UPDATED",
                            null,
                            null,
                            new MessagingPresenceResponse(user.getPublicId(), false, lastSeenAt)
                    ));
                });
            } finally {
                pendingOfflineByPhone.remove(phone);
                pendingLastSeenAtByPhone.remove(phone);
            }
        }, OFFLINE_GRACE_MS, TimeUnit.MILLISECONDS);

        pendingOfflineByPhone.put(phone, f);
    }

    private String resolvePhoneKey(WebSocketSession session) {
        if (session == null) return null;
        try {
            Object v = session.getAttributes() != null ? session.getAttributes().get(MessagingWebSocketSessionRegistry.PHONE_KEY_ATTR) : null;
            if (v instanceof String s && !s.isBlank()) return s;
        } catch (Exception ignored) {
            // ignore
        }
        try {
            return session.getPrincipal() != null ? session.getPrincipal().getName() : null;
        } catch (Exception ignored) {
            return null;
        }
    }

    private String resolveCanonicalPhone(String phone) {
        if (phone == null || phone.isBlank()) return phone;
        return userService.findByPhoneNumber(phone)
                .map(User::getPhoneNumber)
                .filter(v -> v != null && !v.isBlank())
                .orElse(phone);
    }
}
