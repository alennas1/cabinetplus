package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

public record UserDeviceResponse(
        String deviceKey,
        String deviceName,
        LocalDateTime lastLogin,
        String location,
        boolean currentDevice,
        int sessionCount
) {
}
