package com.cabinetplus.backend.notifications;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.cabinetplus.backend.dto.NotificationResponse;
import com.cabinetplus.backend.events.NotificationCreatedEvent;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.services.PushSubscriptionService;
import com.cabinetplus.backend.services.WebPushService;
import com.cabinetplus.backend.websocket.MessagingWebSocketHandler;

@Component
public class NotificationPushNotifier {

    private final MessagingWebSocketHandler webSocketHandler;
    private final WebPushService webPushService;
    private final PushSubscriptionService pushSubscriptionService;
    private final UserRepository userRepository;

    public NotificationPushNotifier(
            MessagingWebSocketHandler webSocketHandler,
            WebPushService webPushService,
            PushSubscriptionService pushSubscriptionService,
            UserRepository userRepository
    ) {
        this.webSocketHandler = webSocketHandler;
        this.webPushService = webPushService;
        this.pushSubscriptionService = pushSubscriptionService;
        this.userRepository = userRepository;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onNotificationCreated(NotificationCreatedEvent event) {
        if (event == null || event.notification() == null) return;
        if (!webPushService.isEnabled()) return;

        String phone = event.recipientPhone();
        Long userId = event.recipientUserId();
        if (phone == null || phone.isBlank() || userId == null) return;

        if (webSocketHandler.isOnline(phone)) return;

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;

        List<com.cabinetplus.backend.models.PushSubscription> subs = pushSubscriptionService.list(user);
        if (subs == null || subs.isEmpty()) return;

        NotificationResponse n = event.notification();
        String title = (n.title() != null && !n.title().isBlank()) ? n.title() : "Cabinet+";
        String body = (n.body() != null && !n.body().isBlank()) ? n.body() : "Vous avez une nouvelle notification.";
        String url = (n.url() != null && !n.url().isBlank()) ? n.url() : "/";

        Map<String, Object> payload = Map.of(
                "title", title,
                "body", body,
                "url", url,
                "notificationId", n.id(),
                "notificationType", n.type() != null ? n.type().name() : null
        );

        for (var sub : subs) {
            webPushService.send(sub, payload);
        }
    }
}

