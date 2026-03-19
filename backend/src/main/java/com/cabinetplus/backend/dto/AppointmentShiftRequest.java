package com.cabinetplus.backend.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

public record AppointmentShiftRequest(
        @NotNull(message = "La date est obligatoire") LocalDate date,
        @NotBlank(message = "La direction est obligatoire")
        @Pattern(regexp = "^(forward|backward)$", message = "La direction est invalide") String direction,
        @NotNull(message = "La duree est obligatoire")
        @Positive(message = "La duree est invalide") Integer minutes,
        @NotBlank(message = "Le scope est obligatoire")
        @Pattern(regexp = "^(all|range)$", message = "Le scope est invalide") String scope,
        @Pattern(regexp = "^\\d{2}:\\d{2}$", message = "Heure de debut invalide") String startTime,
        @Pattern(regexp = "^\\d{2}:\\d{2}$", message = "Heure de fin invalide") String endTime,
        @Min(value = 0, message = "Horaire de debut invalide")
        @Max(value = 1440, message = "Horaire de debut invalide") Integer workingDayStartMinutes,
        @Min(value = 0, message = "Horaire de fin invalide")
        @Max(value = 1440, message = "Horaire de fin invalide") Integer workingDayEndMinutes
) {}
