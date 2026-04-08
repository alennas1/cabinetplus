package com.cabinetplus.backend.websocket;

import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

@Component
public class MessagingWebSocketSessionRegistry {

    public static final String PHONE_KEY_ATTR = "messagingPhoneKey";

    private final ConcurrentHashMap<String, CopyOnWriteArraySet<WebSocketSession>> sessionsByPhone = new ConcurrentHashMap<>();

    public void add(WebSocketSession session) {
        if (session == null) return;
        String phone = session.getAttributes() != null ? (String) session.getAttributes().get(PHONE_KEY_ATTR) : null;
        if (phone == null || phone.isBlank()) {
            phone = session.getPrincipal() != null ? session.getPrincipal().getName() : null;
        }
        if (phone == null || phone.isBlank()) return;
        sessionsByPhone.computeIfAbsent(phone, k -> new CopyOnWriteArraySet<>()).add(session);
    }

    public void remove(WebSocketSession session) {
        if (session == null) return;
        String phone = session.getAttributes() != null ? (String) session.getAttributes().get(PHONE_KEY_ATTR) : null;
        if (phone == null || phone.isBlank()) {
            phone = session.getPrincipal() != null ? session.getPrincipal().getName() : null;
        }
        if (phone == null || phone.isBlank()) return;
        Set<WebSocketSession> set = sessionsByPhone.get(phone);
        if (set == null) return;
        set.remove(session);
        if (set.isEmpty()) sessionsByPhone.remove(phone);
    }

    public boolean isOnline(String phone) {
        if (phone == null || phone.isBlank()) return false;
        Set<WebSocketSession> set = sessionsByPhone.get(phone);
        if (set == null || set.isEmpty()) return false;
        return set.stream().anyMatch(s -> s != null && s.isOpen());
    }

    public Set<WebSocketSession> getSessions(String phone) {
        if (phone == null || phone.isBlank()) return Set.of();
        Set<WebSocketSession> set = sessionsByPhone.get(phone);
        if (set == null) return Set.of();
        return Set.copyOf(set);
    }

    public Set<WebSocketSession> getAllSessions() {
        Set<WebSocketSession> out = new HashSet<>();
        for (Set<WebSocketSession> set : sessionsByPhone.values()) {
            if (set == null || set.isEmpty()) continue;
            out.addAll(set);
        }
        return Set.copyOf(out);
    }
}
