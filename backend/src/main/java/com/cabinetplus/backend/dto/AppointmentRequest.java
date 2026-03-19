package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

import com.cabinetplus.backend.enums.AppointmentStatus;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record AppointmentRequest(
        @NotNull(message = "La date de debut est obligatoire") LocalDateTime dateTimeStart,
        @NotNull(message = "La date de fin est obligatoire") LocalDateTime dateTimeEnd,
        @NotNull(message = "Le statut est obligatoire") AppointmentStatus status,
        @Size(max = 500, message = "Les notes ne doivent pas depasser 500 caracteres") String notes,
        @NotNull(message = "Le patient est obligatoire") @Positive(message = "Le patient est invalide") Long patientId
) {}
