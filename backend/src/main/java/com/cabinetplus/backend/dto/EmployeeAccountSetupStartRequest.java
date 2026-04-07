package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record EmployeeAccountSetupStartRequest(
        @NotBlank(message = "ID d'invitation obligatoire")
        @jakarta.validation.constraints.Pattern(regexp = "^\\d{4,12}$", message = "ID d'invitation invalide")
        String employeeSetupCode
) {}
