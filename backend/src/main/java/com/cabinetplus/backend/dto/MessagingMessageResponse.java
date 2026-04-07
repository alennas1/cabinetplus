package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record MessagingMessageResponse(
        Long id,
        Long threadId,
        UUID senderPublicId,
        String senderRole,
        String senderName,
        String senderBadge,
        String content,
        LocalDateTime createdAt,
        boolean readByOther
) {
}

