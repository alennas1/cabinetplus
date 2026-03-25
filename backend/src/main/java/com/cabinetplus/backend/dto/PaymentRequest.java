package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

import com.cabinetplus.backend.models.Payment.Method;
import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record PaymentRequest(
        @NotNull Long patientId,
        @NotNull @Min(0) Double amount,
        @NotNull Method method,
        @JsonProperty(access = JsonProperty.Access.READ_ONLY)
        LocalDateTime date,    // ignored; server sets current date/time
        Long receivedByUserId  // optional
) {}


