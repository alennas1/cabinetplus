package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PrescriptionSummaryDTO {
    private Long id;         // Added unique ID
    private UUID publicId;
    private String rxId;
    private LocalDateTime date;
    private String createdByName;
}
