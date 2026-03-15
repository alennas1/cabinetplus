package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.Min;

public record PatientManagementSettingsRequest(
        @Min(0) Integer cancelledAppointmentsThreshold,
        @Min(0) Double moneyOwedThreshold
) {
}

