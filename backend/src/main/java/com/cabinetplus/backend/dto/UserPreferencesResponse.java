package com.cabinetplus.backend.dto;

public record UserPreferencesResponse(
        String workingHoursMode,
        String workingHoursStart,
        String workingHoursEnd,
        String timeFormat,
        String dateFormat,
        String moneyFormat,
        String currencyLabel
) {
}
