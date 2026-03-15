package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.Data;

@Data
public class PrescriptionResponseDTO {
    private Long id;
    private UUID publicId;
    private String rxId;
    private LocalDateTime date;
    private String notes;
    private String patientName;
    private Integer patientAge;
    private String practitionerName;
    private List<PrescriptionMedicationDTO> medications;
}
