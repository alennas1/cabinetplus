package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

public record SupportMessageResponse(
        Long id,
        Long threadId,
        Long senderId,
        String senderRole,
        String senderName,
        String content,
        LocalDateTime createdAt,
        boolean readByOther,
        String attachmentUrl,
        String attachmentContentType,
        String attachmentOriginalName
) {}
