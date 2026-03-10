package com.cabinetplus.backend.dto;

import com.cabinetplus.backend.models.Medication.DosageForm;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MedicationRequest {
    @NotBlank(message = "Le nom est obligatoire")
    private String name;

    @NotBlank(message = "Le nom generique est obligatoire")
    private String genericName;

    @NotNull(message = "La forme galenique est obligatoire")
    private DosageForm dosageForm;

    @NotBlank(message = "Le dosage est obligatoire (ex: 500mg, 10ml)")
    private String strength;

    private String description;
}


