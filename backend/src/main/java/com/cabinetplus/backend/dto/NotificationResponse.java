package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

import com.cabinetplus.backend.enums.NotificationType;

public record NotificationResponse(
        Long id,
        NotificationType type,
        String title,
        String body,
        String url,
        String data,
        LocalDateTime createdAt,
        LocalDateTime readAt
) {
}

