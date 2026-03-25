package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

public record SupportThreadSummaryResponse(
        Long id,
        Long clinicOwnerId,
        String clinicOwnerName,
        String clinicName,
        String phoneNumber,
        java.time.LocalDateTime createdAt,
        String firstMessagePreview,
        java.time.LocalDateTime firstMessageAt,
        String lastMessagePreview,
        LocalDateTime lastMessageAt,
        long unreadCount
) {}
