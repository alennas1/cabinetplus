package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

import com.cabinetplus.backend.models.Payment.Method;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record PaymentRequest(
        @NotNull Long patientId,
        @NotNull @Min(0) Double amount,
        @NotNull Method method,
        LocalDateTime date,    // optional; defaults to now if null
        Long receivedByUserId  // optional
) {}


