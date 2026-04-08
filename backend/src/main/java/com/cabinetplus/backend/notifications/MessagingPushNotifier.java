package com.cabinetplus.backend.notifications;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.cabinetplus.backend.events.MessagingMessageCreatedEvent;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.services.PushSubscriptionService;
import com.cabinetplus.backend.services.WebPushService;
import com.cabinetplus.backend.websocket.MessagingWebSocketHandler;

@Component
public class MessagingPushNotifier {

    private final MessagingWebSocketHandler webSocketHandler;
    private final WebPushService webPushService;
    private final PushSubscriptionService pushSubscriptionService;
    private final UserRepository userRepository;

    public MessagingPushNotifier(
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

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMessageCreated(MessagingMessageCreatedEvent event) {
        if (event == null) return;
        if (!webPushService.isEnabled()) return;

        String recipientPhone = event.recipientPhone();
        Long recipientUserId = event.recipientUserId();
        if (recipientPhone == null || recipientPhone.isBlank() || recipientUserId == null) return;

        // If user is actively connected, rely on WebSocket updates instead of push.
        if (webSocketHandler.isOnline(recipientPhone)) return;

        User user = userRepository.findById(recipientUserId).orElse(null);
        if (user == null) return;

        List<com.cabinetplus.backend.models.PushSubscription> subs = pushSubscriptionService.list(user);
        if (subs == null || subs.isEmpty()) return;

        String from = event.recipientThread() != null ? event.recipientThread().otherName() : null;
        String title = "Nouveau message";
        String body = (from != null && !from.isBlank()) ? ("De " + from) : "Ouvrez la messagerie pour lire.";

        String url = "LAB".equalsIgnoreCase(user.getRole() != null ? user.getRole().name() : "") ? "/lab/messagerie" : "/messagerie";

        Map<String, Object> payload = Map.of(
                "title", title,
                "body", body,
                "url", url,
                "threadId", event.threadId()
        );

        for (var sub : subs) {
            webPushService.send(sub, payload);
        }
    }
}

