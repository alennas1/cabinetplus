package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record ProthesisCatalogRequest(
    @NotBlank(message = "Le nom est obligatoire") String name,
    Long materialId, 
    @NotNull @Positive Double defaultPrice,
    boolean isFlatFee
) {}

