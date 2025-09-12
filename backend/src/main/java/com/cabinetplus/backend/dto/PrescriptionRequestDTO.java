package com.cabinetplus.backend.dto;
import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PrescriptionRequestDTO {

    @NotBlank(message = "Prescription ID is required")
    private String rxId;

    @NotBlank(message = "Patient ID is required")
    private String patientId;

    @NotNull(message = "Date is required")
    private LocalDate date;

    private String notes;

    @NotEmpty(message = "At least one medication must be provided")
    @Valid
    private List<PrescriptionMedicationDTO> medications;
}
