package com.cabinetplus.backend.websocket;

import java.util.List;
import java.util.UUID;

public record LabOpsRealtimeEvent(
        String type,
        String action,
        List<Long> ids,
        String decision,
        UUID dentistPublicId,
        UUID laboratoryPublicId
) {
}

