package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

public record SubscriptionSummaryDto(
        boolean planAssigned,
        String planStatus,
        String currentPlanName,
        LocalDateTime expirationDate,
        boolean hasNextPlan,
        String nextPlanName,
        LocalDateTime nextPlanStartDate,
        LocalDateTime nextPlanExpirationDate
) {
}

