package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginTwoFactorVerifyRequest(
        @NotBlank String challengeToken,
        @NotBlank String code
) {
}

