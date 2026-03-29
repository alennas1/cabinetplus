package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record AllergyCatalogRequest(
        @NotBlank(message = "Le nom est obligatoire") String name,
        String description
) {}

