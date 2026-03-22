package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AuthRequest(
        @NotBlank(message = "Le numero de telephone est obligatoire")
        @Pattern(
                regexp = "^(?:0[5-7]\\d{8}|(?:\\+?213)[5-7]\\d{8})$",
                message = "Numero de telephone algerien invalide (ex: 0550123456 ou +213550123456)"
        )
        @Size(max = 20, message = "Numero de telephone invalide")
        String phoneNumber,

        @NotBlank(message = "Le mot de passe est obligatoire")
        @Size(max = 100, message = "Mot de passe invalide")
        String password
) {}
