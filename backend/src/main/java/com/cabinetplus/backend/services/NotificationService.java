package com.cabinetplus.backend.services;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.cabinetplus.backend.dto.NotificationResponse;
import com.cabinetplus.backend.enums.NotificationType;
import com.cabinetplus.backend.events.NotificationCreatedEvent;
import com.cabinetplus.backend.models.Notification;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.NotificationRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final int MAX_LIMIT = 100;

    private final NotificationRepository notificationRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional(readOnly = true)
    public List<NotificationResponse> listMyNotifications(User actor, int limit) {
        if (actor == null) return List.of();
        int safeLimit = Math.max(1, Math.min(MAX_LIMIT, limit));
        return notificationRepository
                .findByRecipientOrderByCreatedAtDescIdDesc(actor, PageRequest.of(0, safeLimit))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public long countUnread(User actor) {
        if (actor == null) return 0L;
        return notificationRepository.countByRecipientAndReadAtIsNull(actor);
    }

    @Transactional
    public NotificationResponse markRead(User actor, Long notificationId) {
        if (actor == null || notificationId == null) return null;
        Notification n = notificationRepository.findByIdAndRecipient(notificationId, actor).orElse(null);
        if (n == null) return null;
        if (n.getReadAt() == null) {
            n.setReadAt(LocalDateTime.now());
            notificationRepository.save(n);
        }
        return toResponse(n);
    }

    @Transactional
    public int markAllRead(User actor) {
        if (actor == null) return 0;
        LocalDateTime now = LocalDateTime.now();
        List<Notification> items = notificationRepository
                .findByRecipientOrderByCreatedAtDescIdDesc(actor, PageRequest.of(0, MAX_LIMIT))
                .stream()
                .filter(n -> n != null && n.getReadAt() == null)
                .toList();
        int updated = 0;
        for (Notification n : items) {
            n.setReadAt(now);
            updated++;
        }
        notificationRepository.saveAll(items);
        return updated;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public NotificationResponse create(User recipient,
                                      NotificationType type,
                                      String title,
                                      String body,
                                      String url,
                                      String data) {
        if (recipient == null || recipient.getId() == null || type == null) return null;
        Notification n = new Notification();
        n.setRecipient(recipient);
        n.setType(type);
        n.setTitle(title);
        n.setBody(body);
        n.setUrl(url);
        n.setData(data);
        n.setCreatedAt(LocalDateTime.now());
        Notification saved = notificationRepository.save(n);

        NotificationResponse res = toResponse(saved);
        try {
            eventPublisher.publishEvent(new NotificationCreatedEvent(
                    recipient.getId(),
                    recipient.getPhoneNumber(),
                    res
            ));
        } catch (Exception ignored) {
            // ignore event publishing failures
        }
        return res;
    }

    @Transactional
    public void updateDecisionPayload(User recipient, NotificationType type, Long entityId, String decision) {
        if (recipient == null || recipient.getId() == null || entityId == null || decision == null) return;
        String match = "%\"entityId\":" + entityId + "%";
        String newDecision = "\"decision\":\"" + decision + "\"";
        notificationRepository.updateDecisionInData(recipient.getId(), type.name(), match, newDecision);
    }

    public NotificationResponse toResponse(Notification n) {
        if (n == null) return null;
        return new NotificationResponse(
                n.getId(),
                n.getType(),
                n.getTitle(),
                n.getBody(),
                n.getUrl(),
                n.getData(),
                n.getCreatedAt(),
                n.getReadAt()
        );
    }
}
