package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

public record FournisseurPaymentResponse(
        Long id,
        Double amount,
        LocalDateTime paymentDate,
        String notes
) {}

