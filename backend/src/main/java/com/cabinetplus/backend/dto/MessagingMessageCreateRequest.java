package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record MessagingMessageCreateRequest(
        @NotBlank(message = "Message obligatoire")
        String content
) {
}

