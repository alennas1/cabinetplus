package com.cabinetplus.backend.dto;

import java.util.List;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PrescriptionDTO(
        @NotNull Long patientId,
        @NotNull Long practitionerId,
        String notes,
        @Size(min = 1, message = "At least one medication is required")
        List<PrescriptionMedicationDTO> medications
) {}
