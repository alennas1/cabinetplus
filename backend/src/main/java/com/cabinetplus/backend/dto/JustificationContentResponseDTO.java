package com.cabinetplus.backend.dto;

import com.cabinetplus.backend.enums.JustificationType;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class JustificationContentResponseDTO {

    private Long id;

    private String title;


    private String content;
}