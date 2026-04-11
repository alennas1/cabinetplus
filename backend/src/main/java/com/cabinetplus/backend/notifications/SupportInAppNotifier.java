package com.cabinetplus.backend.notifications;

import java.util.List;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.cabinetplus.backend.dto.SupportMessageResponse;
import com.cabinetplus.backend.events.SupportMessageCreatedEvent;
import com.cabinetplus.backend.enums.NotificationType;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.services.NotificationService;

@Component
public class SupportInAppNotifier {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public SupportInAppNotifier(NotificationService notificationService, UserRepository userRepository) {
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onSupportMessageCreated(SupportMessageCreatedEvent event) {
        if (event == null) return;
        if (event.threadId() == null) return;

        SupportMessageResponse msg = event.clinicMessage();
        if (msg == null) return;

        String senderRole = msg.senderRole() != null ? msg.senderRole().trim().toUpperCase() : "";
        Long senderId = msg.senderId();

        List<String> recipientPhones = "ADMIN".equals(senderRole) ? event.clinicPhones() : event.adminPhonesWithMessage();
        if (recipientPhones == null || recipientPhones.isEmpty()) return;

        String title = (msg.senderName() != null && !msg.senderName().isBlank())
                ? ("Support · " + msg.senderName())
                : "Support";
        String body = truncate(msg.content(), 240);

        for (String phone : recipientPhones) {
            if (phone == null || phone.isBlank()) continue;
            User recipient = userRepository.findFirstByPhoneNumberOrderByIdAsc(phone.trim()).orElse(null);
            if (recipient == null || recipient.getId() == null || recipient.getRole() == null) continue;
            if (senderId != null && senderId.equals(recipient.getId())) continue;

            String url = buildSupportUrl(recipient.getRole(), event.threadId());
            notificationService.create(recipient, NotificationType.SUPPORT_MESSAGE, title, body, url, null);
        }
    }

    private String buildSupportUrl(UserRole role, Long threadId) {
        String base = role == UserRole.ADMIN
                ? "/admin/support"
                : role == UserRole.LAB
                    ? "/lab/support"
                    : "/support";
        return base + "?thread=" + threadId;
    }

    private String truncate(String value, int max) {
        if (value == null) return null;
        String t = value.trim();
        if (t.length() <= max) return t;
        return t.substring(0, Math.max(0, max - 1)).trim() + "…";
    }
}

