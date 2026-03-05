package com.cabinetplus.backend.dto;

import com.cabinetplus.backend.enums.JustificationType;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class JustificationContentRequestDTO {



    @NotBlank(message = "Title is required")
    private String title;


    @NotBlank(message = "Content is required")
    private String content;
}