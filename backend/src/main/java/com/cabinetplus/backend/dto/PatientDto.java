package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record PatientDto(
    Long id,
    UUID publicId,
    String firstname,
    String lastname,
    Integer age,
    String sex,            //  Added
    String phone,
    String diseases,
    String allergies,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    Long cancelledAppointmentsCount,
    Double moneyOwed,
    Boolean danger,
    Boolean dangerCancelled,
    Boolean dangerOwed,
    LocalDateTime archivedAt,
    String createdByName,
    String updatedByName,
    String archivedByName
) {

    public PatientDto(
            Long id,
            String firstname,
            String lastname,
            Integer age,
            String sex,
            String phone,
            String diseases,
            String allergies,
            LocalDateTime createdAt,
            Long cancelledAppointmentsCount,
            Double moneyOwed,
            Boolean danger,
            Boolean dangerCancelled,
            Boolean dangerOwed
    ) {
        this(
                id,
                null,
                firstname,
                lastname,
                age,
                sex,
                phone,
                diseases,
                allergies,
                createdAt,
                createdAt,
                cancelledAppointmentsCount,
                moneyOwed,
                danger,
                dangerCancelled,
                dangerOwed,
                null,
                null,
                null,
                null
        );
    }
}
