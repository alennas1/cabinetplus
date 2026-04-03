package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

public record LaboratoryBillingEntryResponse(
    Long prothesisId,
    String patientName,
    String prothesisName,
    Double amount,
    LocalDateTime billingDate,
    String createdByName
) {}
