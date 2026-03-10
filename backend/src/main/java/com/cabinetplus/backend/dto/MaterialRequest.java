package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record MaterialRequest(
    @NotBlank(message = "Le nom est obligatoire") String name
) {}

