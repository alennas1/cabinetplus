package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

import com.cabinetplus.backend.enums.FeedbackCategory;

public record FeedbackResponse(
        Long id,
        FeedbackCategory category,
        String customCategoryLabel,
        String message,
        LocalDateTime createdAt,
        Long clinicOwnerId,
        String clinicOwnerName,
        String phoneNumber,
        Long createdById,
        String createdByName
) {}

