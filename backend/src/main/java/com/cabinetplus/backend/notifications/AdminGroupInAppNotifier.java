package com.cabinetplus.backend.notifications;

import java.util.List;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.cabinetplus.backend.events.AdminGroupMessageCreatedEvent;
import com.cabinetplus.backend.enums.NotificationType;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.services.NotificationService;

@Component
public class AdminGroupInAppNotifier {

    private static final String ADMIN_GROUP_URL = "/admin/messagerie?with=__ADMIN_GROUP__";

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public AdminGroupInAppNotifier(NotificationService notificationService, UserRepository userRepository) {
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAdminGroupMessage(AdminGroupMessageCreatedEvent event) {
        if (event == null) return;
        List<Long> recipientIds = event.recipientUserIds();
        if (recipientIds == null || recipientIds.isEmpty()) return;

        String title = (event.senderName() != null && !event.senderName().isBlank())
                ? ("Admins · " + event.senderName())
                : "Admins";
        String body = truncate(event.content(), 240);

        for (Long id : recipientIds) {
            if (id == null) continue;
            if (event.senderUserId() != null && event.senderUserId().equals(id)) continue;
            User recipient = userRepository.findById(id).orElse(null);
            if (recipient == null || recipient.getRole() != UserRole.ADMIN) continue;
            notificationService.create(recipient, NotificationType.ADMIN_GROUP_MESSAGE, title, body, ADMIN_GROUP_URL, null);
        }
    }

    private String truncate(String value, int max) {
        if (value == null) return null;
        String t = value.trim();
        if (t.length() <= max) return t;
        return t.substring(0, Math.max(0, max - 1)).trim() + "…";
    }
}

