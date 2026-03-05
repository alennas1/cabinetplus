package com.cabinetplus.backend.dto;

import com.cabinetplus.backend.enums.JustificationType;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class JustificationDTO {
    private Long id;
    private String title;
    private String finalContent;
    private String date; // formatted as yyyy-MM-dd
    private Long patientId;
    private String patientName;
    private String practitionerName;
}