package com.cabinetplus.backend.dto;

import java.util.UUID;

public record MessagingContactResponse(
        UUID userPublicId,
        Long userId,
        String name,
        String role,
        String badge,
        String meta,
        Long ownerDentistId
        ) {
}
