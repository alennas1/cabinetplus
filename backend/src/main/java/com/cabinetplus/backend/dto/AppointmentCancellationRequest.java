package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AppointmentCancellationRequest(
        @NotBlank(message = "Motif requis")
        @Size(max = 200, message = "Motif trop long (max 200 caractères)")
        String reason
) {
}

