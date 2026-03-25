package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SupportMessageCreateRequest(
        @NotBlank(message = "Message obligatoire")
        @Size(max = 2000, message = "Message trop long")
        String content
) {}

