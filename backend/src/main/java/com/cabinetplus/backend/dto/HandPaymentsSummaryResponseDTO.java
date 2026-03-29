package com.cabinetplus.backend.dto;

public record HandPaymentsSummaryResponseDTO(
        long allCount,
        long allTotal,
        long confirmedCount,
        long confirmedTotal,
        long pendingCount,
        long pendingTotal,
        long rejectedCount,
        long rejectedTotal
) {}

