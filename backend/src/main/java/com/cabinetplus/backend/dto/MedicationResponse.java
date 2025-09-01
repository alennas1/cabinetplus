package com.cabinetplus.backend.dto;

import com.cabinetplus.backend.models.Medication.DosageForm;

import lombok.AllArgsConstructor;
import lombok.Data;

// ✅ Used when sending data back to frontend
@Data
@AllArgsConstructor
public class MedicationResponse {
    private Long id;
    private String name;
    private DosageForm dosageForm;
    private String strength;
    private String description;
}
