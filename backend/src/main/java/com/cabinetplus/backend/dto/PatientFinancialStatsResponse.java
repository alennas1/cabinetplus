package com.cabinetplus.backend.dto;

public record PatientFinancialStatsResponse(
        long patientId,
        double treatmentsTotal,
        double prothesesTotal,
        double billedTotal,
        double paidTotal,
        double balance,
        double balanceAbs,
        boolean hasCredit
) {
}

