package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OtpCodeRequest(
        @NotBlank(message = "Code SMS invalide")
        @Size(max = 20, message = "Code SMS invalide")
        String code
) {
}
