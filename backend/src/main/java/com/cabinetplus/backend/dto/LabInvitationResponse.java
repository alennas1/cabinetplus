package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record LabInvitationResponse(
        Long id,
        UUID dentistPublicId,
        String dentistName,
        String clinicName,
        LocalDateTime invitedAt,
        String status,
        UUID mergeFromLaboratoryPublicId,
        String mergeFromLaboratoryName
) {}

