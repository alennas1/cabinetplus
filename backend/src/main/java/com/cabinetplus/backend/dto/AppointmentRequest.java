package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

import com.cabinetplus.backend.enums.AppointmentStatus;

import jakarta.validation.constraints.NotNull;

public record AppointmentRequest(
        @NotNull LocalDateTime dateTimeStart,
        @NotNull LocalDateTime dateTimeEnd,
        @NotNull AppointmentStatus status,
        String notes,
        @NotNull Long patientId
) {}
