package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ProthesisResponse(
    Long id,
    Long catalogId,
    String patientName,
    String prothesisName,
    String materialName,
    List<Integer> teeth,
    Double finalPrice,
    String notes,
    String status,
    String labName,
    LocalDateTime dateCreated
) {}
