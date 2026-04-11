package com.cabinetplus.backend.notifications;

import java.util.Map;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.cabinetplus.backend.events.NotificationCreatedEvent;
import com.cabinetplus.backend.websocket.MessagingWebSocketHandler;

@Component
public class NotificationRealtimeNotifier {

    private final MessagingWebSocketHandler webSocketHandler;

    public NotificationRealtimeNotifier(MessagingWebSocketHandler webSocketHandler) {
        this.webSocketHandler = webSocketHandler;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onNotificationCreated(NotificationCreatedEvent event) {
        if (event == null || event.notification() == null) return;
        String phone = event.recipientPhone();
        if (phone == null || phone.isBlank()) return;

        webSocketHandler.sendToUser(phone, Map.of(
                "type", "NOTIFICATION_CREATED",
                "notification", event.notification()
        ));
    }
}

