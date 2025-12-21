package com.cabinetplus.backend.dto;

import com.cabinetplus.backend.models.Medication.DosageForm;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MedicationRequest {
    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "genericName is required")
    private String genericName;

    @NotNull(message = "Dosage form is required")
    private DosageForm dosageForm;

    @NotBlank(message = "Strength is required (e.g., 500mg, 10ml)")
    private String strength;

    private String description;
}
