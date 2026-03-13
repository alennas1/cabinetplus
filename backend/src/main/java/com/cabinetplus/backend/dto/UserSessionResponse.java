package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

public record UserSessionResponse(
        Long id,
        LocalDateTime createdAt,
        LocalDateTime lastUsedAt,
        LocalDateTime expiresAt,
        String userAgent,
        String ipAddress,
        String location,
        boolean current
) {}
