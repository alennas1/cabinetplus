package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SecurityPinChangeRequest(
        @NotBlank(message = "Mot de passe requis")
        @Size(max = 100, message = "Mot de passe requis")
        String password,

        @NotBlank(message = "PIN requis")
        @Pattern(regexp = "^\\d{4}$", message = "Le PIN doit contenir 4 chiffres")
        String pin
) {
}
