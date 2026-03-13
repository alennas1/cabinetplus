package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record PasswordResetConfirmRequest(
        @NotBlank(message = "Le numero de telephone est obligatoire")
        @Pattern(
                regexp = "^(?:0[5-7]\\d{8}|(?:\\+?213)[5-7]\\d{8})$",
                message = "Numero de telephone algerien invalide (ex: 0550123456 ou +213550123456)"
        )
        String phoneNumber,

        @NotBlank(message = "Le code SMS est obligatoire")
        String code,

        @NotBlank(message = "Le mot de passe est obligatoire")
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,100}$",
                message = "Mot de passe invalide: minimum 8 caracteres avec majuscule, minuscule, chiffre et symbole"
        )
        String newPassword
) {}
