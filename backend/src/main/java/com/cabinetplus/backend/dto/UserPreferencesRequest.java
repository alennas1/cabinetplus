package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record UserPreferencesRequest(
        @NotBlank String workingHoursMode,
        @NotBlank String workingHoursStart,
        @NotBlank String workingHoursEnd,
        @NotBlank String timeFormat,
        @NotBlank String dateFormat,
        @NotBlank String moneyFormat,
        @NotBlank String currencyLabel
) {
}
