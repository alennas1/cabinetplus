package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record LoginTwoFactorSettingsRequest(
        @NotNull Boolean enabled,

        @NotBlank(message = "Mot de passe requis")
        String password
) {
}
