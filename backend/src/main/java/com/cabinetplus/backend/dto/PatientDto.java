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
    LocalDateTime createdAt,
    Long cancelledAppointmentsCount,
    Double moneyOwed,
    Boolean danger,
    Boolean dangerCancelled,
    Boolean dangerOwed
) {

    public PatientDto(
            Long id,
            String firstname,
            String lastname,
            Integer age,
            String sex,
            String phone,
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
                createdAt,
                cancelledAppointmentsCount,
                moneyOwed,
                danger,
                dangerCancelled,
                dangerOwed
        );
    }
}
