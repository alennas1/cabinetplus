package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginTwoFactorResendRequest(
        @NotBlank String challengeToken
) {
}

