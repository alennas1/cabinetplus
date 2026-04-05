package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

public record TreatmentToothHistoryEntry(
        int toothNumber,
        String treatmentName,
        LocalDateTime date
) {
}

