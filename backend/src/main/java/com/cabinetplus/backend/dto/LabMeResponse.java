package com.cabinetplus.backend.dto;

import java.util.UUID;

public record LabMeResponse(
        UUID publicId,
        String inviteCode,
        String name,
        String contactPerson,
        String phoneNumber,
        String address
) {}
