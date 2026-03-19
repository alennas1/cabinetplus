package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record PrescriptionMedicationRequest(
        @NotNull(message = "Ordonnance obligatoire")
        @Positive(message = "Ordonnance invalide")
        Long prescriptionId,

        @NotNull(message = "Medicament obligatoire")
        @Positive(message = "Medicament invalide")
        Long medicationId,

        @Size(max = 255, message = "Nom invalide")
        String name,

        @Size(max = 255, message = "Dosage invalide")
        String amount,

        @Size(max = 255, message = "Unite invalide")
        String unit,

        @Size(max = 255, message = "Frequence invalide")
        String frequency,

        @Size(max = 255, message = "Duree invalide")
        String duration,

        @Size(max = 255, message = "Instructions invalides")
        String instructions
) {
}
