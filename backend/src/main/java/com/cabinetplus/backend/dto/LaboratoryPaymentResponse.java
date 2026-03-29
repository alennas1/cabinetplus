package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

import com.cabinetplus.backend.enums.RecordStatus;

public record LaboratoryPaymentResponse(
    Long id,
    Double amount,
    LocalDateTime paymentDate,
    String notes,
    RecordStatus recordStatus,
    LocalDateTime cancelledAt
) {}
