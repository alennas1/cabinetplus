package com.cabinetplus.backend.events;

import com.cabinetplus.backend.dto.NotificationResponse;

public record NotificationCreatedEvent(
        Long recipientUserId,
        String recipientPhone,
        NotificationResponse notification
) {
}

