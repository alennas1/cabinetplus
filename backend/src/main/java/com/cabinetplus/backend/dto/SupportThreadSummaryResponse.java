package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

public record SupportThreadSummaryResponse(
        Long id,
        Long clinicOwnerId,
        String clinicOwnerName,
        String clinicName,
        String phoneNumber,
        String clinicOwnerRole,
        java.time.LocalDateTime createdAt,
        String firstMessagePreview,
        java.time.LocalDateTime firstMessageAt,
        String lastMessagePreview,
        LocalDateTime lastMessageAt,
        String lastMessageSenderRole,
        long unreadCount,
        Long lastClinicSenderId,
        String lastClinicSenderRole,
        String lastClinicSenderName,
        String lastClinicSenderPhoneNumber,
        Long claimedByAdminId,
        java.util.UUID claimedByAdminPublicId,
        String claimedByAdminName,
        LocalDateTime claimedAt,
        LocalDateTime finishedAt,
        Boolean clinicOwnerOnline,
        LocalDateTime clinicOwnerLastSeenAt,
        Boolean lastClinicSenderOnline,
        LocalDateTime lastClinicSenderLastSeenAt,
        Long requesterId,
        String requesterName,
        String requesterRole
) {}
