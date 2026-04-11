package com.cabinetplus.backend.websocket;

import java.util.HashSet;
import java.util.Set;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.cabinetplus.backend.events.LabOpsChangedEvent;

@Component
public class LabOpsRealtimeNotifier {

    private final MessagingWebSocketHandler webSocketHandler;

    public LabOpsRealtimeNotifier(MessagingWebSocketHandler webSocketHandler) {
        this.webSocketHandler = webSocketHandler;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onLabOpsChanged(LabOpsChangedEvent event) {
        if (event == null || event.type() == null || event.type().isBlank()) return;

        String normAction = event.action();
        if ("STATUS_CHANGED_BY_DENTIST".equals(normAction) || "STATUS_CHANGED_BY_LAB".equals(normAction)) {
            normAction = "STATUS_CHANGED";
        }

        LabOpsRealtimeEvent payload = new LabOpsRealtimeEvent(
                event.type(),
                normAction,
                event.ids(),
                event.decision(),
                event.dentistPublicId(),
                event.laboratoryPublicId()
        );

        for (String phone : safePhones(event.clinicPhones())) {
            webSocketHandler.sendToUser(phone, payload);
        }
        for (String phone : safePhones(event.labPhones())) {
            webSocketHandler.sendToUser(phone, payload);
        }
    }

    private Set<String> safePhones(Set<String> phones) {
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
