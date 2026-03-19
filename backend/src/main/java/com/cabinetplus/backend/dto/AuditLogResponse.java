package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

public record AuditLogResponse(
        LocalDateTime occurredAt,
        String eventType,
        String status,
        String message,
        String targetType,
        String targetId,
        String targetDisplay,
        Long actorUserId,
        String actorDisplayName,
        String ipAddress,
        String location
) {}
