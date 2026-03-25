package com.cabinetplus.backend.dto;

import java.util.UUID;

public record FournisseurResponse(
        Long id,
        UUID publicId,
        String name,
        String contactPerson,
        String phoneNumber,
        String address
) {}

