package com.cabinetplus.backend.notifications;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.events.MessagingMessageCreatedEvent;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.services.NotificationService;

@Component
public class MessagingInAppNotifier {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public MessagingInAppNotifier(
            NotificationService notificationService,
            UserRepository userRepository
    ) {
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMessageCreated(MessagingMessageCreatedEvent event) {
        if (event == null) return;

        Long recipientUserId = event.recipientUserId();
        if (recipientUserId == null) return;

        var thread = event.recipientThread();
        var msg = event.recipientMessage();
        if (thread == null || msg == null) return;

        User recipient = userRepository.findById(recipientUserId).orElse(null);
        if (recipient == null || recipient.getRole() == null) return;

        String base = recipient.getRole() == UserRole.LAB
                ? "/lab/messagerie"
                : recipient.getRole() == UserRole.ADMIN
                    ? "/admin/messagerie"
                    : "/messagerie";

        String otherPublicId = thread.otherUserPublicId() != null
                ? String.valueOf(thread.otherUserPublicId())
                : "";

        String url = otherPublicId.isBlank()
                ? base
                : (base + "?with=" + otherPublicId);

        String title = (thread.otherName() != null && !thread.otherName().isBlank())
                ? thread.otherName()
                : "Nouveau message";

        String body = truncate(msg.content(), 240);

        // Save DB notification (delivery handled by NotificationCreatedEvent listeners)
        notificationService.create(
                recipient,
                com.cabinetplus.backend.enums.NotificationType.MESSAGING_MESSAGE,
                title,
                body,
                url,
                buildData(thread.otherRole(), thread.otherBadge())
        );
    }

    private String buildData(String otherRole, String otherBadge) {
        try {
            Map<String, Object> data = new LinkedHashMap<>();
            if (otherRole != null && !otherRole.isBlank()) data.put("otherRole", otherRole);
            if (otherBadge != null && !otherBadge.isBlank()) data.put("otherBadge", otherBadge);
            if (data.isEmpty()) return null;
            return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(data);
        } catch (Exception e) {
            return null;
        }
    }

    private String truncate(String value, int max) {
        if (value == null) return null;
        String t = value.trim();
        if (t.length() <= max) return t;
        return t.substring(0, Math.max(0, max - 1)).trim() + "…";
    }
}
