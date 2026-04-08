package com.cabinetplus.backend.websocket;

import com.cabinetplus.backend.dto.SupportMessageResponse;
import com.cabinetplus.backend.dto.SupportThreadSummaryResponse;

public record SupportRealtimeEvent(
        String type,
        SupportThreadSummaryResponse thread,
        SupportMessageResponse message
) {
}

