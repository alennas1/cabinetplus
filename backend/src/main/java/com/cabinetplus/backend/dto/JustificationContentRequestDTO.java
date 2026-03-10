package com.cabinetplus.backend.dto;

import com.cabinetplus.backend.enums.JustificationType;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class JustificationContentRequestDTO {



    @NotBlank(message = "Le titre est obligatoire")
    private String title;


    @NotBlank(message = "Le contenu est obligatoire")
    private String content;
}

