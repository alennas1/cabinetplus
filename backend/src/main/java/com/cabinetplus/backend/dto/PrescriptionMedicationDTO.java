package com.cabinetplus.backend.dto;

import lombok.Data;

@Data
public class PrescriptionMedicationDTO {
    private Long medicationId;   // FK -> Medication
    private Double amount;
    private String unit;
    private String frequency;
    private String duration;
    private String instructions;
}
