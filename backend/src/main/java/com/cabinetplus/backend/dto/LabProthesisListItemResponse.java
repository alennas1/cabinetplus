package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record LabProthesisListItemResponse(
        Long id,
        String patientName,
        String prothesisName,
        String status,
        Double labCost,
        LocalDateTime billingDate,
        LocalDateTime sentToLabDate,
        LocalDateTime readyAt,
        LocalDateTime actualReturnDate,
        UUID dentistPublicId,
        String dentistName,
        LocalDateTime cancelledAt,
        String cancelRequestDecision,
        String stlFilename,
        Integer filesCount
) {}
