package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record EmployeeAccountSetupConfirmRequest(
        @NotBlank(message = "ID employe obligatoire")
        String employeeId,

        @NotBlank(message = "Code SMS obligatoire")
        @Size(min = 4, max = 10, message = "Code SMS invalide")
        String code,

        @NotBlank(message = "Mot de passe obligatoire")
        @Size(min = 8, max = 72, message = "Le mot de passe doit contenir entre 8 et 72 caracteres")
        String newPassword,

        @NotBlank(message = "PIN obligatoire")
        @Pattern(regexp = "^\\d{4}$", message = "Le PIN doit contenir 4 chiffres")
        String pin
) {}

