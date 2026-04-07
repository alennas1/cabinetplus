package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import com.cabinetplus.backend.enums.RecordStatus;

public record LabPaymentListItemResponse(
        Long id,
        Double amount,
        LocalDateTime paymentDate,
        String notes,
        RecordStatus recordStatus,
        LocalDateTime cancelledAt,
        UUID dentistPublicId,
        String dentistName,
        String cancelRequestDecision
) {}
