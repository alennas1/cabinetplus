package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record PlanSelectRequest(
        @NotNull(message = "planId est obligatoire")
        @Positive(message = "planId invalide")
        Long planId
) {
}
