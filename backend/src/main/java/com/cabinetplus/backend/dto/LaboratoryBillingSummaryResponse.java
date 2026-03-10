package com.cabinetplus.backend.dto;

public record LaboratoryBillingSummaryResponse(
    Integer year,
    Integer month,
    Double total
) {}
