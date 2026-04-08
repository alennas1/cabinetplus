package com.cabinetplus.backend.websocket;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.cabinetplus.backend.events.SupportClaimUpdatedEvent;
import com.cabinetplus.backend.events.SupportMessageCreatedEvent;

@Component
public class SupportRealtimeNotifier {

    private final MessagingWebSocketHandler webSocketHandler;

    public SupportRealtimeNotifier(MessagingWebSocketHandler webSocketHandler) {
        this.webSocketHandler = webSocketHandler;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onSupportMessageCreated(SupportMessageCreatedEvent event) {
        if (event == null) return;

        SupportRealtimeEvent clinicPayload = new SupportRealtimeEvent("SUPPORT_MESSAGE_CREATED", event.clinicThread(), event.clinicMessage());
        for (String phone : safePhones(event.clinicPhones())) {
            webSocketHandler.sendToUser(phone, clinicPayload);
        }

        Set<String> withMessage = new HashSet<>(safePhones(event.adminPhonesWithMessage()));
        for (String phone : safePhones(event.adminPhones())) {
            if (withMessage.contains(phone)) {
                webSocketHandler.sendToUser(
                        phone,
                        new SupportRealtimeEvent("SUPPORT_MESSAGE_CREATED", event.adminThread(), event.adminMessage())
                );
            } else {
                webSocketHandler.sendToUser(
                        phone,
                        new SupportRealtimeEvent("SUPPORT_THREAD_UPDATED", event.adminThread(), null)
                );
            }
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onSupportClaimUpdated(SupportClaimUpdatedEvent event) {
        if (event == null) return;

        SupportRealtimeEvent clinicPayload = new SupportRealtimeEvent("SUPPORT_CLAIM_UPDATED", event.clinicThread(), event.clinicMessage());
        for (String phone : safePhones(event.clinicPhones())) {
            webSocketHandler.sendToUser(phone, clinicPayload);
        }

        SupportRealtimeEvent adminPayload = new SupportRealtimeEvent("SUPPORT_CLAIM_UPDATED", event.adminThread(), event.adminMessage());
        for (String phone : safePhones(event.adminPhones())) {
            webSocketHandler.sendToUser(phone, adminPayload);
        }
    }

    private Set<String> safePhones(List<String> phones) {
        Set<String> out = new HashSet<>();
        if (phones == null) return out;
        for (String p : phones) {
            if (p == null) continue;
            String t = p.trim();
            if (!t.isBlank()) out.add(t);
        }
        return out;
    }
}

