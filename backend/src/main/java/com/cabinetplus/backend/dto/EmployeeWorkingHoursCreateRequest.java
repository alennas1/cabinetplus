package com.cabinetplus.backend.dto;

import java.time.DayOfWeek;
import java.time.LocalTime;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record EmployeeWorkingHoursCreateRequest(
        @NotBlank(message = "Employe obligatoire")
        String employeeId,

        @NotNull(message = "Jour obligatoire")
        DayOfWeek dayOfWeek,

        LocalTime startTime,
        LocalTime endTime
) {
}
