package com.cabinetplus.backend.websocket;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.cabinetplus.backend.events.MessagingMessageCreatedEvent;

@Component
public class MessagingRealtimeNotifier {

    private final MessagingWebSocketHandler webSocketHandler;

    public MessagingRealtimeNotifier(MessagingWebSocketHandler webSocketHandler) {
        this.webSocketHandler = webSocketHandler;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMessageCreated(MessagingMessageCreatedEvent event) {
        if (event == null) return;

        if (event.senderPhone() != null && event.senderThread() != null && event.senderMessage() != null) {
            webSocketHandler.sendToUser(
                    event.senderPhone(),
                    new MessagingRealtimeEvent("MESSAGE_CREATED", event.senderThread(), event.senderMessage(), null)
            );
        }

        if (event.recipientPhone() != null && event.recipientThread() != null && event.recipientMessage() != null) {
            webSocketHandler.sendToUser(
                    event.recipientPhone(),
                    new MessagingRealtimeEvent("MESSAGE_CREATED", event.recipientThread(), event.recipientMessage(), null)
            );
        }
    }
}
