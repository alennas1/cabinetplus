package com.cabinetplus.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class JustificationRequest {
    private Long patientId;
    
    private String title;
    private String content;
}