package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PhoneChangeConfirmRequest(
        @NotBlank(message = "Numero de telephone invalide ou manquant.")
        @Pattern(
                regexp = "^(?:0[5-7]\\d{8}|(?:\\+?213)[5-7]\\d{8})$",
                message = "Numero de telephone algerien invalide (ex: 0550123456 ou +213550123456)"
        )
        String phoneNumber,

        @NotBlank(message = "Code SMS invalide")
        @Size(max = 20, message = "Code SMS invalide")
        String code,

        @NotBlank(message = "Mot de passe requis")
        @Size(max = 100, message = "Mot de passe requis")
        String password
) {
}
