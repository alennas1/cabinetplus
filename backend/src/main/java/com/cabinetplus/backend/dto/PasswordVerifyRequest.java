package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record PasswordVerifyRequest(
        @NotBlank(message = "Mot de passe requis")
        String password
) {
}
