package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PlanRequest(
        @NotBlank(message = "Code obligatoire")
        @Size(max = 50, message = "Code invalide")
        String code,

        @Size(max = 255, message = "Nom invalide")
        String name,

        @Min(value = 0, message = "Prix invalide")
        Integer monthlyPrice,

        @Min(value = 0, message = "Prix invalide")
        Integer yearlyMonthlyPrice,

        @Min(value = 1, message = "Duree invalide")
        Integer durationDays,

        @NotNull(message = "Max dentistes obligatoire")
        @Min(value = 1, message = "Max dentistes invalide")
        Integer maxDentists,

        @NotNull(message = "Max employes obligatoire")
        @Min(value = 0, message = "Max employes invalide")
        Integer maxEmployees,

        @NotNull(message = "Max patients obligatoire")
        @Min(value = 0, message = "Max patients invalide")
        Integer maxPatients,

        @NotNull(message = "Stockage max obligatoire")
        @DecimalMin(value = "0.0", message = "Stockage max invalide")
        Double maxStorageGb,

        Boolean active
) {
    public boolean activeOrTrue() {
        return active == null || active;
    }
}
