package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

public record PatientDto(
    Long id,
    String firstname,
    String lastname,
    Integer age,
    String sex,            //  Added
    String phone,
    LocalDateTime createdAt
) {}
