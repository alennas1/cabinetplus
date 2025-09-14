package com.cabinetplus.backend.dto;

import lombok.Data;

@Data
public class PrescriptionMedicationDTO {
    private Long prescriptionMedicationId;
    private Long medicationId;
    private String name;         // Medication name
    private String form;         // From Medication.dosageForm
    private String strength;     // From Medication.strength
    private String description;  // Optional
    private Double amount;
    private String unit;
    private String frequency;
    private String duration;
    private String instructions;
}
