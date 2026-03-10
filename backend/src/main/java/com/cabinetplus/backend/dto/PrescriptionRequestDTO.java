package com.cabinetplus.backend.dto;
import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PrescriptionRequestDTO {

    @NotNull(message = "L'identifiant du patient est obligatoire") // âœ… CORRECT: @NotNull is for Numbers/Longs
private Long patientId;

    // Optional: allow server to set or keep existing date
    private LocalDate date;

    private String notes;

    @NotEmpty(message = "Au moins un medicament est obligatoire")
    @Valid
    private List<PrescriptionMedicationDTO> medications;
}

