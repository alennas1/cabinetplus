package com.cabinetplus.backend.dto;

import java.time.LocalDate;

public record AppointmentShiftRequest(
        LocalDate date,
        String direction,
        Integer minutes,
        String scope,
        String startTime,
        String endTime,
        Integer workingDayStartMinutes,
        Integer workingDayEndMinutes
) {}
