package com.cabinetplus.backend.events;

import java.util.List;

import com.cabinetplus.backend.dto.SupportMessageResponse;
import com.cabinetplus.backend.dto.SupportThreadSummaryResponse;

public record SupportMessageCreatedEvent(
        Long threadId,
        List<String> clinicPhones,
        List<String> adminPhones,
        List<String> adminPhonesWithMessage,
        SupportThreadSummaryResponse clinicThread,
        SupportThreadSummaryResponse adminThread,
        SupportMessageResponse clinicMessage,
        SupportMessageResponse adminMessage
) {
}

