package com.cabinetplus.backend.dto;

import com.cabinetplus.backend.enums.FeedbackCategory;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record FeedbackCreateRequest(
        @NotNull(message = "Catégorie obligatoire")
        FeedbackCategory category,
        @Size(max = 80, message = "Catégorie personnalisée trop longue")
        String customCategoryLabel,
        @NotBlank(message = "Message obligatoire")
        @Size(max = 5000, message = "Message trop long")
        String message
) {}

