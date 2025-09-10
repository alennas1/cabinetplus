package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PrescriptionMedicationDTO(
        @NotNull Long medicationId,
        @NotBlank String dosage,
        @NotBlank String frequency,
        @NotBlank String duration,
        String instructions
) {}
