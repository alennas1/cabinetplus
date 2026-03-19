package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record PasswordChangeRequest(
        @NotBlank(message = "Ancien mot de passe requis")
        String oldPassword,

        @NotBlank(message = "Nouveau mot de passe requis")
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,100}$",
                message = "Mot de passe invalide: minimum 8 caracteres avec majuscule, minuscule, chiffre et symbole"
        )
        String newPassword,

        Boolean logoutAll
) {
    public boolean logoutAllOrFalse() {
        return Boolean.TRUE.equals(logoutAll);
    }
}
