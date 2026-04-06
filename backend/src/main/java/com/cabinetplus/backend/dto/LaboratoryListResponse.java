package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import com.cabinetplus.backend.enums.RecordStatus;

public record LaboratoryListResponse(
        Long id,
        UUID publicId,
        String name,
        String contactPerson,
        String phoneNumber,
        String address,
        LocalDateTime createdAt,
        String createdByName,
        RecordStatus recordStatus,
        LocalDateTime archivedAt,
        boolean connected,
        boolean editable
) {
}

