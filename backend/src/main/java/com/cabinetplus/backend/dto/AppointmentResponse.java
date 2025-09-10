package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

import com.cabinetplus.backend.enums.AppointmentStatus;

public record AppointmentResponse(
        Long id,
        LocalDateTime dateTimeStart,
        LocalDateTime dateTimeEnd,
        AppointmentStatus status,
        String notes,
        PatientDto patient,
        Long practitionerId,
        String practitionerFirstname,
        String practitionerLastname
) {}