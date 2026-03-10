package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record DeviseRequest(
    @NotBlank(message = "Le titre est obligatoire")
    String title,
    
    @NotEmpty(message = "Le devis doit contenir au moins un element")
    List<DeviseItemRequest> items
) {}

