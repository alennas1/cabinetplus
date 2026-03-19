package com.cabinetplus.backend.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record ProthesisCatalogRequest(
    @NotBlank(message = "Le nom est obligatoire")
    @Size(max = 255, message = "Le nom ne doit pas depasser 255 caracteres")
    String name,
    Long materialId, 
    @NotNull @Positive Double defaultPrice,
    @PositiveOrZero Double defaultLabCost,
    @JsonProperty("isFlatFee") @JsonAlias("flatFee") boolean isFlatFee,
    @JsonProperty("isMultiUnit") @JsonAlias("multiUnit") boolean isMultiUnit
) {}

