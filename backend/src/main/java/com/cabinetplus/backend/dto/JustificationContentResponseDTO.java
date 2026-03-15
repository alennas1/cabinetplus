package com.cabinetplus.backend.dto;

import com.cabinetplus.backend.enums.JustificationType;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class JustificationContentResponseDTO {

    private Long id;
    private UUID publicId;

    private String title;


    private String content;
}
