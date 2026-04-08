package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record MessagingPresenceResponse(
        UUID userPublicId,
        boolean online,
        LocalDateTime lastSeenAt
) {
}
