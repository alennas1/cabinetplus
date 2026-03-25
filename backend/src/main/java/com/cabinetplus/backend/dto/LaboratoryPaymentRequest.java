package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record LaboratoryPaymentRequest(
    @NotNull @Min(0) Double amount,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    LocalDateTime paymentDate,
    String notes
) {}
