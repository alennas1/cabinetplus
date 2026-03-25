package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

public record FournisseurBillingEntryResponse(
        Long referenceId,
        String source,
        String label,
        Double amount,
        LocalDateTime billingDate
) {}

