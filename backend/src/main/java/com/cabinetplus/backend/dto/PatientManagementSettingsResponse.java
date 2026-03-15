package com.cabinetplus.backend.dto;

public record PatientManagementSettingsResponse(
        Integer cancelledAppointmentsThreshold,
        Double moneyOwedThreshold
) {
}

