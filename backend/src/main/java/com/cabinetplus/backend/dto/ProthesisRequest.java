package com.cabinetplus.backend.dto;

import java.util.List;

public record ProthesisRequest(
        Long patientId,
        Long catalogId,
        List<Integer> teeth,
        Double finalPrice,
        Double labCost,
        String code,
        String notes
) {
}
