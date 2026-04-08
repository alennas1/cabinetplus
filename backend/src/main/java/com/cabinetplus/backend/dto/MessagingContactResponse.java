package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record MessagingContactResponse(
        UUID userPublicId,
        Long userId,
        String name,
        String role,
        String badge,
        String meta,
        Long ownerDentistId,
        boolean online,
        LocalDateTime lastSeenAt,
        UUID detailsPublicId
        ) {
}
