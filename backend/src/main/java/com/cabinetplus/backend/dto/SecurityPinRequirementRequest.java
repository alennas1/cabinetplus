package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotNull;

public record SecurityPinRequirementRequest(
        @NotNull(message = "Statut requis")
        Boolean enabled,
        String password
) {
}

