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
    Double labCost,    // Ajouté
    String notes,
    String status,
    String labName,
    LocalDateTime dateCreated,
    LocalDateTime sentToLabDate, // Ajouté
    LocalDateTime actualReturnDate // Ajouté
) {}