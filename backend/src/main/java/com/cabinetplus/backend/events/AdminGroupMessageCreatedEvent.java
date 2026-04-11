package com.cabinetplus.backend.events;

import java.util.List;

public record AdminGroupMessageCreatedEvent(
        Long senderUserId,
        String senderName,
        String content,
        List<Long> recipientUserIds
) {
}

