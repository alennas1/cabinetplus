package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ProthesisResponse(
        Long id,
        Long catalogId,
        Long patientId,
        String patientName,
        String prothesisName,
        String materialName,
        List<Integer> teeth,
        Double finalPrice,
        Double labCost,
        String code,
        String notes,
        String status,
        String labName,
        LocalDateTime dateCreated,
        LocalDateTime sentToLabDate,
        String sentToLabByName,
        LocalDateTime actualReturnDate,
        String receivedByName,
        LocalDateTime posedAt,
        String posedByName,
        String createdByName,
        LocalDateTime updatedAt,
        String updatedByName,
        LocalDateTime cancelledAt,
        String cancelledByName,
        String cancelReason
) {
}
