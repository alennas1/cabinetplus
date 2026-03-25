package com.cabinetplus.backend.dto;

public record FournisseurBillingSummaryResponse(
        Integer year,
        Integer month,
        Double total
) {}

