package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CancellationRequest(
        @NotBlank(message = "PIN requis")
        @Pattern(regexp = "^\\d{4}$", message = "Le PIN doit contenir 4 chiffres")
        String pin,

        @NotBlank(message = "Motif requis")
        @Size(max = 200, message = "Motif trop long (max 200 caractères)")
        String reason
) {
}

