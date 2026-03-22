package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record SecurityPinEnableRequest(
        @NotBlank(message = "PIN requis")
        @Pattern(regexp = "^\\d{4}$", message = "Le PIN doit contenir 4 chiffres")
        String pin,

        @NotBlank(message = "Mot de passe requis")
        String password
) {
}
