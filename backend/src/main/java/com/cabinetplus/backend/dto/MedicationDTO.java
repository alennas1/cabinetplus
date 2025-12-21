package com.cabinetplus.backend.dto;

import com.cabinetplus.backend.models.Medication.DosageForm;

import lombok.Data;

@Data
public class MedicationDTO {
    private Long id;          // existing medication id
    private String name;      // e.g. "Amoxicillin"
    private String genericName; // e.g. "Amoxicillin"
    private String strength;  // e.g. "500mg"
    private DosageForm dosageForm;
    private String description;
}
