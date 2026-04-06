package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record LaboratoryConnectionInviteRequest(
        @NotBlank(message = "L'ID du laboratoire est obligatoire")
        String labPublicId,

        // Optional: private lab (id or publicId) to merge into the connected lab on acceptance.
        String mergeFromLaboratoryId
) {}

