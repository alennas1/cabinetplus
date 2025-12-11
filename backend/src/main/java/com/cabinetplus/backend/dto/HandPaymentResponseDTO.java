package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

public record HandPaymentResponseDTO(
        Long paymentId,
        Integer amount,
        LocalDateTime paymentDate,
        String paymentStatus,
        String paymentMethod,
        String notes,

        Long userId,
        String username,
        String fullName,
        String phoneNumber,

        Long planId,
        String planName,
        Integer planDurationDays
) {}
