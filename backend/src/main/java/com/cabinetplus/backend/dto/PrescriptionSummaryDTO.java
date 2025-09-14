package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PrescriptionSummaryDTO {
    private Long id;         // Added unique ID
    private String rxId;
    private LocalDateTime date;
}