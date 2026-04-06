package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

public record LabProthesisListItemResponse(
        Long id,
        String patientName,
        String prothesisName,
        String status,
        Double labCost,
        LocalDateTime billingDate,
        String dentistName,
        LocalDateTime cancelledAt,
        String cancelRequestDecision
) {}

