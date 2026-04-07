package com.cabinetplus.backend.dto;

public record LabDentistFinancialSummaryResponse(
        double totalOwed,
        double totalPaid,
        double remainingToPay
) {
}

