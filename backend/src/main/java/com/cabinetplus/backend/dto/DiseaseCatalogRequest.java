package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record DiseaseCatalogRequest(
        @NotBlank(message = "Le nom est obligatoire") String name,
        String description
) {}

