package com.cabinetplus.backend.dto;

public record FinanceSummaryDTO(
        double totalExpenses,
        double totalPayments,
        double stockValue,
        double treatmentRevenue
) {}
