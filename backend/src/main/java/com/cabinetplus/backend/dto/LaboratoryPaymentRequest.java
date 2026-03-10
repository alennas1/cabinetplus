package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record LaboratoryPaymentRequest(
    @NotNull @Min(0) Double amount,
    LocalDateTime paymentDate,
    String notes
) {}
