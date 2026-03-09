package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record DeviseItemRequest(
    Long treatmentCatalogId,  // Optional: Fill if item is a treatment
    Long prothesisCatalogId,  // Optional: Fill if item is a prosthesis
    
    @NotNull @Positive
    Double unitPrice,
    
    @NotNull @Positive
    Integer quantity
) {}