package com.cabinetplus.backend.events;

import java.util.List;

import com.cabinetplus.backend.dto.SupportMessageResponse;
import com.cabinetplus.backend.dto.SupportThreadSummaryResponse;

public record SupportClaimUpdatedEvent(
        Long threadId,
        List<String> clinicPhones,
        List<String> adminPhones,
        SupportThreadSummaryResponse clinicThread,
        SupportThreadSummaryResponse adminThread,
        SupportMessageResponse clinicMessage,
        SupportMessageResponse adminMessage
) {
}

