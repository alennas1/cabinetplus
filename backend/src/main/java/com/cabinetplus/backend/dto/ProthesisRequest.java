package com.cabinetplus.backend.dto;

import java.util.List;

import com.cabinetplus.backend.validation.UniqueIntegers;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record ProthesisRequest(
        @NotNull(message = "Patient obligatoire")
        @Positive(message = "Patient invalide")
        Long patientId,

        @NotNull(message = "Prothese obligatoire")
        @Positive(message = "Prothese invalide")
        Long catalogId,

        @NotNull(message = "Dents obligatoires")
        @Size(min = 1, max = 32, message = "Dents invalides")
        @UniqueIntegers(message = "Les dents doivent etre uniques")
        List<
                @NotNull(message = "Dent invalide")
                @Min(value = 1, message = "Dent invalide")
                @Max(value = 32, message = "Dent invalide")
                Integer> teeth,

        @PositiveOrZero(message = "Prix invalide")
        Double finalPrice,

        @PositiveOrZero(message = "Cout labo invalide")
        Double labCost,

        @Size(max = 255, message = "Code invalide")
        String code,

        @Size(max = 500, message = "Les notes ne doivent pas depasser 500 caracteres")
        String notes
) {
}
