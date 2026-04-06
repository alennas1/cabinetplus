package com.cabinetplus.backend.dto;

import java.util.UUID;

public record LabDentistListItemResponse(
        UUID dentistPublicId,
        String dentistName,
        String clinicName,
        String phoneNumber
) {}

