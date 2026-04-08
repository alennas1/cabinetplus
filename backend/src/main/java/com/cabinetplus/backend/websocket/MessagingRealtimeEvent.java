package com.cabinetplus.backend.websocket;

import com.cabinetplus.backend.dto.MessagingMessageResponse;
import com.cabinetplus.backend.dto.MessagingPresenceResponse;
import com.cabinetplus.backend.dto.MessagingThreadSummaryResponse;

public record MessagingRealtimeEvent(
        String type,
        MessagingThreadSummaryResponse thread,
        MessagingMessageResponse message,
        MessagingPresenceResponse presence
) {
}
