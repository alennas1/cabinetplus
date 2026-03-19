package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AuthRequest(
        @NotBlank(message = "Identifiant obligatoire")
        @Size(max = 255, message = "Identifiant invalide")
        String username,

        @NotBlank(message = "Le mot de passe est obligatoire")
        @Size(max = 100, message = "Mot de passe invalide")
        String password
) {}
