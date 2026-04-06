package com.cabinetplus.backend.dto;

import java.time.Instant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AdminPlanGrantRequest(
        @NotNull Long planId,
        @NotBlank String duration,
        @NotBlank String startMode,
        Instant startsAt
) {}

