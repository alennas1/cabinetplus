package com.cabinetplus.backend.dto;
import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PrescriptionRequestDTO {

    @NotBlank(message = "Patient ID is required")
    private String patientId;

    // Optional: allow server to set or keep existing date
    private LocalDate date;

    private String notes;

    @NotEmpty(message = "At least one medication must be provided")
    @Valid
    private List<PrescriptionMedicationDTO> medications;
}