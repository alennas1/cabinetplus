package com.cabinetplus.backend.events;

import com.cabinetplus.backend.dto.MessagingMessageResponse;
import com.cabinetplus.backend.dto.MessagingThreadSummaryResponse;

public record MessagingMessageCreatedEvent(
        Long threadId,
        Long senderUserId,
        Long recipientUserId,
        String senderPhone,
        String recipientPhone,
        MessagingThreadSummaryResponse senderThread,
        MessagingThreadSummaryResponse recipientThread,
        MessagingMessageResponse senderMessage,
        MessagingMessageResponse recipientMessage
) {
}

