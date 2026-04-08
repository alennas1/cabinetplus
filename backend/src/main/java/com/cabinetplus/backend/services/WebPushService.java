package com.cabinetplus.backend.services;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.cabinetplus.backend.models.PushSubscription;
import com.fasterxml.jackson.databind.ObjectMapper;

import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import nl.martijndwars.webpush.Utils;

@Service
public class WebPushService {

    private final ObjectMapper objectMapper;

    private final String publicKey;
    private final String privateKey;
    private final String subject;

    private volatile PushService pushService;

    public WebPushService(
            ObjectMapper objectMapper,
            @Value("${app.webpush.public-key:}") String publicKey,
            @Value("${app.webpush.private-key:}") String privateKey,
            @Value("${app.webpush.subject:mailto:support@cabinetplusdz.com}") String subject
    ) {
        this.objectMapper = objectMapper;
        this.publicKey = publicKey != null ? publicKey.trim() : "";
        this.privateKey = privateKey != null ? privateKey.trim() : "";
        this.subject = subject != null ? subject.trim() : "mailto:support@cabinetplusdz.com";
    }

    public boolean isEnabled() {
        return !publicKey.isBlank() && !privateKey.isBlank();
    }

    public String getPublicKey() {
        return publicKey;
    }

    public boolean send(PushSubscription subscription, Map<String, Object> payload) {
        if (subscription == null) return false;
        if (!isEnabled()) return false;

        String endpoint = subscription.getEndpoint();
        String p256dh = subscription.getP256dh();
        String auth = subscription.getAuth();
        if (endpoint == null || endpoint.isBlank()) return false;
        if (p256dh == null || p256dh.isBlank()) return false;
        if (auth == null || auth.isBlank()) return false;

        try {
            String body = objectMapper.writeValueAsString(payload != null ? payload : Map.of());
            Notification notification = new Notification(endpoint, p256dh, auth, body.getBytes(StandardCharsets.UTF_8));

            PushService svc = getOrInitPushService();
            svc.send(notification);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private PushService getOrInitPushService() throws Exception {
        PushService existing = pushService;
        if (existing != null) return existing;
        synchronized (this) {
            if (pushService != null) return pushService;
            PushService svc = new PushService();
            svc.setSubject(subject);
            svc.setPublicKey(Utils.loadPublicKey(publicKey));
            svc.setPrivateKey(Utils.loadPrivateKey(privateKey));
            pushService = svc;
            return svc;
        }
    }
}

