package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

import com.cabinetplus.backend.models.Payment.Method;

public record PaymentResponse(
        Long id,
        Long patientId,
        Double amount,
        Method method,
        LocalDateTime date,
        Long receivedByUserId
) {}