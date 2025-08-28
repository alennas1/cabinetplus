package com.cabinetplus.backend.dto;


public record FinancialSummaryResponse(
        Long patientId,
        Double totalInvoiced,
        Double totalPaid,
        Double balance // totalInvoiced - totalPaid
) {}