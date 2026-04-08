package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record MessagingThreadSummaryResponse(
        Long id,
        UUID otherUserPublicId,
        Long otherUserId,
        String otherName,
        String otherRole,
        String otherBadge,
        Long otherOwnerDentistId,
        String lastMessagePreview,
        LocalDateTime lastMessageAt,
        long unreadCount,
        boolean otherOnline,
        LocalDateTime otherLastSeenAt,
        boolean lastMessageFromViewer
) {
}
