package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record EmployeeAccountSetupStartRequest(
        @NotBlank(message = "ID employe obligatoire")
        String employeeId
) {}

