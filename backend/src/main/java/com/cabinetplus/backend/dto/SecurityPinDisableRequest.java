package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SecurityPinDisableRequest(
        @NotBlank(message = "Mot de passe requis")
        @Size(max = 100, message = "Mot de passe requis")
        String password
) {
}
