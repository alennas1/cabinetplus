package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record MaterialRequest(
    @NotBlank(message = "Name is required") String name
) {}